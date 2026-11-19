-- D-050: o casamento de pagamento e a neutralização da linha informativa rodam no banco a cada importação,
-- independentemente da versão publicada das Edge Functions. Gatilho por instrução (não por linha) com tabela
-- de transição; `pg_trigger_depth()` evita reentrada quando a própria função insere entradas de fatura.

create function private.match_card_payments_after_insert() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare owner uuid;
begin
  if pg_trigger_depth() > 1 then return null; end if;
  for owner in select distinct owner_id from inserted_rows loop
    perform public.internal_match_card_payments(owner);
  end loop;
  return null;
end;
$$;

revoke all on function private.match_card_payments_after_insert() from public, anon, authenticated;

create trigger transactions_match_card_payments
  after insert on public.transactions
  referencing new table as inserted_rows
  for each statement execute function private.match_card_payments_after_insert();

create trigger card_statement_entries_match_card_payments
  after insert on public.card_statement_entries
  referencing new table as inserted_rows
  for each statement execute function private.match_card_payments_after_insert();
