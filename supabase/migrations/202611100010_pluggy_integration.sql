-- Habilitação do provedor comercial Pluggy (Open Finance)
-- Preserva isolamento multitenant, RLS e constraints de integridade

alter table public.open_finance_connections drop constraint if exists open_finance_connections_provider_code_check;
alter table public.open_finance_connections add constraint open_finance_connections_provider_code_check check (provider_code in ('mock', 'pluggy'));

alter table public.open_finance_connections drop constraint if exists open_finance_connections_institution_check;
alter table public.open_finance_connections add constraint open_finance_connections_institution_check check (length(trim(institution)) > 0);

alter table public.open_finance_connections add column if not exists pluggy_item_id text;
alter table public.open_finance_connections add column if not exists pluggy_account_id text;

-- RPC para registrar conexão concluída via PluggyConnect widget
create or replace function public.pluggy_register_connection(
  account uuid,
  institution text,
  scopes text[],
  item_id text,
  pluggy_account text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare
  w uuid := public.my_workspace();
  c uuid;
begin
  if w is null or not exists(select 1 from public.financial_accounts where id = account and workspace_id = w and not archived) then
    raise exception 'Acesso negado ou conta local inválida';
  end if;

  if item_id is null or length(trim(item_id)) = 0 then
    raise exception 'ID do item Pluggy é obrigatório';
  end if;

  -- Se já existir conexão ativa para o mesmo item e conta, atualizamos
  select id into c from public.open_finance_connections
  where workspace_id = w and pluggy_item_id = item_id and account_id = account;

  if c is not null then
    update public.open_finance_connections
    set status = 'active',
        institution = pluggy_register_connection.institution,
        scopes = pluggy_register_connection.scopes,
        pluggy_account_id = pluggy_register_connection.pluggy_account,
        expires_at = now() + interval '90 days',
        last_sync_at = now()
    where id = c and workspace_id = w;
  else
    insert into public.open_finance_connections(
      workspace_id, account_id, provider_code, institution, scopes, status,
      expires_at, pluggy_item_id, pluggy_account_id
    ) values (
      w, account, 'pluggy', institution, scopes, 'active',
      now() + interval '90 days', item_id, pluggy_account
    ) returning id into c;
  end if;

  insert into public.open_finance_consents(
    workspace_id, connection_id, action, scopes, expires_at
  ) values (
    w, c, 'authorize', scopes, now() + interval '90 days'
  );

  return c;
end $$;

-- RPC para registrar transações sincronizadas da Pluggy na fila de revisão humana (stage_import)
create or replace function public.pluggy_stage_transactions(
  connection uuid,
  hash text,
  rows jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  w uuid := public.my_workspace();
  c public.open_finance_connections;
  b uuid;
  cnt integer;
begin
  select * into c from public.open_finance_connections where id = connection and workspace_id = w for update;
  if not found then
    raise exception 'Conexão Pluggy inexistente ou não autorizada';
  end if;

  if c.status <> 'active' or c.expires_at <= now() then
    raise exception 'Consentimento inativo ou expirado';
  end if;

  if not 'transactions' = any(c.scopes) then
    raise exception 'Escopo de transações não autorizado';
  end if;

  cnt := jsonb_array_length(rows);
  if cnt > 0 then
    b := public.stage_import(c.account_id, hash, 'pluggy-v1', rows);
    update public.open_finance_connections
    set last_sync_at = now()
    where id = connection and workspace_id = w;

    insert into public.open_finance_sync_runs(
      workspace_id, connection_id, status, batch_id, rows_received
    ) values (
      w, connection, 'success', b, cnt
    );

    return jsonb_build_object('status', 'success', 'rows', cnt, 'batch_id', b);
  else
    update public.open_finance_connections
    set last_sync_at = now()
    where id = connection and workspace_id = w;

    return jsonb_build_object('status', 'success', 'rows', 0);
  end if;
end $$;

revoke all on function public.pluggy_register_connection(uuid, text, text[], text, text) from public;
grant execute on function public.pluggy_register_connection(uuid, text, text[], text, text) to authenticated;

revoke all on function public.pluggy_stage_transactions(uuid, text, jsonb) from public;
grant execute on function public.pluggy_stage_transactions(uuid, text, jsonb) to authenticated;

