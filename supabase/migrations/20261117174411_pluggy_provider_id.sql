alter table private.pluggy_transactions
  add column provider_id text;

create or replace function public.internal_store_pluggy_transactions(p_rows jsonb) returns integer
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare inserted_count integer;
begin
  select count(*) into inserted_count
  from jsonb_array_elements(p_rows) row
  where not exists (
    select 1
    from private.pluggy_transactions stored
    where stored.owner_id = (row->>'owner_id')::uuid
      and stored.external_transaction_id = row->>'external_transaction_id'
  );

  insert into private.pluggy_transactions (
    owner_id, connection_id, pluggy_account_id, external_transaction_id, provider_id,
    description, amount_cents, event_date, provider_type, raw_category, merchant_name,
    installment_number, total_installments, installment_group_key, original_transaction_id, provider_bill_id
  )
  select
    (row->>'owner_id')::uuid, (row->>'connection_id')::uuid, (row->>'pluggy_account_id')::uuid,
    row->>'external_transaction_id', row->>'provider_id', row->>'description', (row->>'amount_cents')::bigint,
    (row->>'event_date')::date, row->>'provider_type', row->>'raw_category', row->>'merchant_name',
    (row->>'installment_number')::smallint, (row->>'total_installments')::smallint,
    row->>'installment_group_key', row->>'original_transaction_id', row->>'provider_bill_id'
  from jsonb_array_elements(p_rows) row
  on conflict (owner_id, external_transaction_id) do update set
    provider_id = coalesce(excluded.provider_id, private.pluggy_transactions.provider_id);

  return inserted_count;
end;
$$;

revoke all on function public.internal_store_pluggy_transactions(jsonb) from public, anon, authenticated;
grant execute on function public.internal_store_pluggy_transactions(jsonb) to service_role;

comment on column private.pluggy_transactions.provider_id is
  'Identificador da instituicao, quando o conector regulado do MeuPluggy o fornecer; nao substitui o id Pluggy.';
