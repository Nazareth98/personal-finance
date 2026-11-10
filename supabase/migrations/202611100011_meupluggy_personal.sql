-- A aplicação passa a consumir somente o Meu Pluggy pessoal do titular.
-- Mantemos linhas mock antigas como histórico, revogadas e sem RPC acessível.
update public.open_finance_connections set status='revoked' where provider_code='mock';
alter table public.open_finance_connections
  drop constraint if exists open_finance_connections_provider_code_check;
update public.open_finance_connections set provider_code='meupluggy' where provider_code='pluggy';
alter table public.open_finance_connections
  add constraint open_finance_connections_provider_code_check
  check(provider_code in ('mock','meupluggy'));
alter table public.open_finance_connections alter column expires_at drop not null;
create unique index if not exists meupluggy_provider_account_mapping
  on public.open_finance_connections(workspace_id,pluggy_item_id,pluggy_account_id)
  where provider_code='meupluggy' and pluggy_item_id is not null and pluggy_account_id is not null;

revoke all on function public.mock_connection_intent(uuid,text,text[]),
  public.mock_authorize(uuid,uuid), public.mock_consent_action(uuid,text),
  public.mock_sync(uuid,boolean) from public,anon,authenticated;
revoke all on function public.pluggy_register_connection(uuid,text,text[],text,text),
  public.pluggy_stage_transactions(uuid,text,jsonb) from public,anon,authenticated;

create function public.meupluggy_register_connection(
  p_account uuid,
  p_item_id text,
  p_provider_account_id text,
  p_provider_account_type text,
  p_institution text,
  p_consent_expires_at timestamptz
) returns uuid language plpgsql security definer set search_path='' as $$
declare
  w uuid:=public.my_workspace();
  c uuid;
  account_kind text;
begin
  if w is null or p_item_id is null or length(trim(p_item_id))=0
    or p_provider_account_id is null or length(trim(p_provider_account_id))=0
    or p_consent_expires_at is null or p_consent_expires_at<=now() then
    raise exception 'Configuração ou autorização Meu Pluggy inválida';
  end if;
  select kind into account_kind from public.financial_accounts
    where workspace_id=w and id=p_account and not archived;
  if not found then raise exception 'Conta local indisponível'; end if;
  if (p_provider_account_type='CREDIT' and account_kind<>'credit')
    or (p_provider_account_type='BANK' and account_kind not in ('checking','cash','savings'))
    or p_provider_account_type not in ('BANK','CREDIT') then
    raise exception 'Tipo da conta do provedor incompatível com a conta local';
  end if;
  if exists(select 1 from public.open_finance_connections
      where workspace_id=w and provider_code='meupluggy'
        and pluggy_item_id=p_item_id and status='revoked') then
    raise exception 'Item revogado; renove o acesso no Dashboard da Pluggy e carregue o novo item';
  end if;
  select id into c from public.open_finance_connections
    where workspace_id=w and provider_code='meupluggy'
      and pluggy_item_id=p_item_id and pluggy_account_id=p_provider_account_id
    for update;
  if c is null then
    insert into public.open_finance_connections(
      workspace_id,account_id,provider_code,institution,status,scopes,
      expires_at,pluggy_item_id,pluggy_account_id
    ) values(
      w,p_account,'meupluggy',left(trim(p_institution),100),'active',
      array['accounts','transactions'],p_consent_expires_at,p_item_id,p_provider_account_id
    ) returning id into c;
  else
    update public.open_finance_connections set
      account_id=p_account,institution=left(trim(p_institution),100),
      scopes=array['accounts','transactions'],status='active',
      expires_at=p_consent_expires_at
      where workspace_id=w and id=c;
  end if;
  insert into public.open_finance_consents(workspace_id,connection_id,action,scopes,expires_at)
    values(w,c,'authorize',array['accounts','transactions'],p_consent_expires_at);
  return c;
end $$;

create function public.meupluggy_stage_transactions(
  p_connection uuid,
  p_hash text,
  p_rows jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  w uuid:=public.my_workspace();
  c public.open_finance_connections;
  r jsonb;
  accepted jsonb:='[]'::jsonb;
  b uuid;
  inserted_count integer;
begin
  select * into c from public.open_finance_connections
    where workspace_id=w and id=p_connection for update;
  if not found or c.provider_code<>'meupluggy' or c.status<>'active'
    or c.expires_at is null or c.expires_at<=now() then
    raise exception 'Vínculo Meu Pluggy inativo ou expirado';
  end if;
  if not 'transactions'=any(c.scopes) then raise exception 'Escopo de movimentos não autorizado'; end if;
  if p_hash is null or length(p_hash)>200 or jsonb_typeof(p_rows)<>'array'
    or jsonb_array_length(p_rows)>2000 then
    raise exception 'Lote Meu Pluggy inválido';
  end if;
  for r in select value from jsonb_array_elements(p_rows) loop
    if coalesce(r->>'external_key','')='' then raise exception 'Movimento sem identificador externo'; end if;
    if not exists(select 1 from public.import_raw_rows
        where workspace_id=w and proposal->>'external_key'=r->>'external_key')
      and not exists(select 1 from public.source_links
        where workspace_id=w and account_id=c.account_id and source_key=r->>'external_key') then
      accepted:=accepted||jsonb_build_array(r);
    end if;
  end loop;
  inserted_count:=jsonb_array_length(accepted);
  if inserted_count>0 then
    b:=public.stage_import(c.account_id,p_hash,'meupluggy-v1',accepted);
  end if;
  update public.open_finance_connections set last_sync_at=now()
    where workspace_id=w and id=p_connection;
  insert into public.open_finance_sync_runs(workspace_id,connection_id,status,batch_id,rows_received)
    values(w,p_connection,'success',b,inserted_count);
  return jsonb_build_object('status','success','rows',inserted_count,'batch_id',b);
end $$;

create function public.meupluggy_revoke_item(p_item_id text)
returns integer language plpgsql security definer set search_path='' as $$
declare
  w uuid:=public.my_workspace();
  c record;
  changed integer:=0;
begin
  if w is null or p_item_id is null or length(trim(p_item_id))=0 then
    raise exception 'Item Meu Pluggy indisponível';
  end if;
  for c in select id,scopes,expires_at from public.open_finance_connections
    where workspace_id=w and provider_code='meupluggy'
      and pluggy_item_id=p_item_id and status='active' for update
  loop
    update public.open_finance_connections set status='revoked'
      where workspace_id=w and id=c.id;
    insert into public.open_finance_consents(workspace_id,connection_id,action,scopes,expires_at)
      values(w,c.id,'revoke',c.scopes,coalesce(c.expires_at,now()));
    changed:=changed+1;
  end loop;
  if changed=0 then raise exception 'Nenhum vínculo ativo para este item'; end if;
  return changed;
end $$;

revoke all on function public.meupluggy_register_connection(uuid,text,text,text,text,timestamptz),
  public.meupluggy_stage_transactions(uuid,text,jsonb),
  public.meupluggy_revoke_item(text) from public,anon;
grant execute on function public.meupluggy_register_connection(uuid,text,text,text,text,timestamptz),
  public.meupluggy_stage_transactions(uuid,text,jsonb),
  public.meupluggy_revoke_item(text) to authenticated;

-- A API da aplica��o usa nomes Meu Pluggy; as tabelas legadas ficam internas para preservar backups antigos.
alter function public.workspace_snapshot() rename to snapshot_before_meupluggy;
revoke all on function public.snapshot_before_meupluggy() from public,authenticated;
create function public.workspace_snapshot() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 result:=public.snapshot_before_meupluggy();
 return (result-'open_finance_connections')||jsonb_build_object('meupluggy_connections',coalesce((select jsonb_agg(value) from jsonb_array_elements(coalesce(result->'open_finance_connections','[]'::jsonb)) as entries(value) where value->>'provider_code'='meupluggy'),'[]'::jsonb));
end $$;
revoke all on function public.workspace_snapshot() from public;grant execute on function public.workspace_snapshot() to authenticated;
alter function public.restore_backup(jsonb,boolean) rename to restore_before_meupluggy;
revoke all on function public.restore_before_meupluggy(jsonb,boolean) from public,authenticated;
create function public.restore_backup(backup jsonb,confirmed boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare legacy_backup jsonb;
begin
 if auth.uid() is null then raise exception 'Acesso negado';end if;
 if backup ? 'profile' and (backup->'profile'->>'id')::uuid is distinct from auth.uid() then raise exception 'Perfil de outro usuário';end if;
 if backup ? 'workspace' and (backup->'workspace'->>'owner_id')::uuid is distinct from auth.uid() then raise exception 'Proprietário incompatível';end if;
 legacy_backup:=backup;
 if backup ? 'meupluggy_connections' then
   legacy_backup:=(backup-'meupluggy_connections')||jsonb_build_object('open_finance_connections',backup->'meupluggy_connections');
 end if;
 return public.restore_before_meupluggy(legacy_backup,confirmed);
end $$;
revoke all on function public.restore_backup(jsonb,boolean) from public;grant execute on function public.restore_backup(jsonb,boolean) to authenticated;



