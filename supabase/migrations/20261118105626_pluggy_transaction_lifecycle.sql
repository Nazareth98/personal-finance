alter table private.pluggy_transactions
  add column provider_status text,
  add column deleted_at timestamptz;

alter table public.transactions
  add column source_deleted_at timestamptz;

create or replace function private.prevent_imported_transaction_mutation() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if old.source = 'pluggy' then
    if tg_op = 'UPDATE'
      and new.source = 'pluggy'
      and (to_jsonb(new) - 'source_deleted_at') = (to_jsonb(old) - 'source_deleted_at') then
      return new;
    end if;
    raise exception 'Imported transactions are immutable';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function public.internal_store_pluggy_transactions(p_rows jsonb) returns integer
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare inserted_count integer;
begin
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Rows must be a JSON array';
  end if;

  select count(*) into inserted_count
  from jsonb_array_elements(p_rows) row
  where not exists (
    select 1
    from private.pluggy_transactions stored
    where stored.owner_id = (row->>'owner_id')::uuid
      and stored.external_transaction_id = row->>'external_transaction_id'
  );

  insert into private.pluggy_transactions (
    owner_id, connection_id, pluggy_account_id, external_transaction_id, provider_id, provider_status,
    description, amount_cents, event_date, provider_type, raw_category, merchant_name,
    installment_number, total_installments, installment_group_key, original_transaction_id, provider_bill_id
  )
  select
    (row->>'owner_id')::uuid, (row->>'connection_id')::uuid, (row->>'pluggy_account_id')::uuid,
    row->>'external_transaction_id', row->>'provider_id', row->>'provider_status', row->>'description',
    (row->>'amount_cents')::bigint, (row->>'event_date')::date, row->>'provider_type', row->>'raw_category',
    row->>'merchant_name', (row->>'installment_number')::smallint, (row->>'total_installments')::smallint,
    row->>'installment_group_key', row->>'original_transaction_id', row->>'provider_bill_id'
  from jsonb_array_elements(p_rows) row
  on conflict (owner_id, external_transaction_id) do update set
    provider_id = coalesce(excluded.provider_id, private.pluggy_transactions.provider_id),
    provider_status = excluded.provider_status,
    provider_type = excluded.provider_type,
    raw_category = excluded.raw_category,
    merchant_name = excluded.merchant_name,
    installment_number = excluded.installment_number,
    total_installments = excluded.total_installments,
    installment_group_key = excluded.installment_group_key,
    original_transaction_id = excluded.original_transaction_id,
    provider_bill_id = excluded.provider_bill_id,
    deleted_at = null;

  update public.transactions t
  set source_deleted_at = null
  from jsonb_array_elements(p_rows) row
  where t.owner_id = (row->>'owner_id')::uuid
    and t.external_key = 'pluggy:' || row->>'external_transaction_id'
    and t.source_deleted_at is not null;

  return inserted_count;
end;
$$;

create function public.internal_mark_pluggy_transactions_deleted(
  p_owner_id uuid,
  p_connection_id uuid,
  p_external_transaction_ids text[]
) returns integer
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare affected_count integer;
begin
  if coalesce(array_length(p_external_transaction_ids, 1), 0) = 0 then
    raise exception 'Transaction ids are required';
  end if;

  update private.pluggy_transactions
  set deleted_at = coalesce(deleted_at, now())
  where owner_id = p_owner_id
    and connection_id = p_connection_id
    and external_transaction_id = any(p_external_transaction_ids);
  get diagnostics affected_count = row_count;

  update public.transactions t
  set source_deleted_at = coalesce(t.source_deleted_at, now())
  where t.owner_id = p_owner_id
    and t.source = 'pluggy'
    and t.external_key in (
      select 'pluggy:' || staged.external_transaction_id
      from private.pluggy_transactions staged
      where staged.owner_id = p_owner_id
        and staged.connection_id = p_connection_id
        and staged.external_transaction_id = any(p_external_transaction_ids)
    );

  return affected_count;
end;
$$;

revoke all on function public.internal_store_pluggy_transactions(jsonb) from public, anon, authenticated;
grant execute on function public.internal_store_pluggy_transactions(jsonb) to service_role;
revoke all on function public.internal_mark_pluggy_transactions_deleted(uuid, uuid, text[]) from public, anon, authenticated;
grant execute on function public.internal_mark_pluggy_transactions_deleted(uuid, uuid, text[]) to service_role;

comment on column private.pluggy_transactions.provider_status is
  'Estado mais recente recebido do MeuPluggy sem alterar o conteudo financeiro importado.';
comment on column private.pluggy_transactions.deleted_at is
  'Exclusao reversivel recebida do MeuPluggy; uma releitura do mesmo id limpa este campo.';
comment on column public.transactions.source_deleted_at is
  'Oculta reversivelmente um lancamento removido na origem, preservando o historico imutavel.';
