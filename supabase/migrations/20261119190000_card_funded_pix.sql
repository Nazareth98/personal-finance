-- D-063: Pix pago com cartão de crédito. O Itaú lança na conta corrente o Pix saindo (“Pix enviado com cartão …”) e,
-- no mesmo dia, o “Crédito liberado para Pix <cartão>” entrando; quem paga é o cartão, que registra a cobrança com
-- tarifa. Sem esta regra o gasto contava duas vezes e o crédito virava receita. O par na conta corrente fica neutro
-- (`adjustment`); a cobrança no cartão continua sendo a despesa. Nunca mexe em lançamento que já tem decisão.

alter table public.transaction_semantic_overrides
  drop constraint transaction_semantic_overrides_reason_check,
  add constraint transaction_semantic_overrides_reason_check check (reason in (
    'owner_confirmation', 'auto_statement_carryover', 'auto_card_payment_match', 'auto_card_payment_mirror',
    'auto_self_transfer', 'auto_card_funded_pix'
  ));

create function public.internal_match_card_funded_pix(p_owner uuid) returns integer
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare
  debit public.transactions%rowtype;
  credit public.transactions%rowtype;
  neutralized integer := 0;
begin
  for debit in
    select t.* from public.transactions t
    join public.financial_accounts account on account.id = t.account_id
    where t.owner_id = p_owner and t.source = 'pluggy' and t.source_deleted_at is null and t.amount_cents < 0
      and account.account_type <> 'credit_card'
      and private.normalize_classification_text(t.description) like 'pix enviado com cartao%'
      and not exists (select 1 from public.transaction_semantic_overrides where transaction_id = t.id)
      and not exists (select 1 from public.transaction_links where t.id in (source_transaction_id, target_transaction_id))
      and not exists (select 1 from public.savings_movements where transaction_id = t.id)
      and not exists (select 1 from public.card_statement_entries where transaction_id = t.id)
    order by t.event_date, t.id
  loop
    select c.* into credit
    from public.transactions c
    where c.owner_id = p_owner and c.source = 'pluggy' and c.source_deleted_at is null
      and c.account_id = debit.account_id and c.amount_cents = -debit.amount_cents
      and abs(c.event_date - debit.event_date) <= 1
      and private.normalize_classification_text(c.description) like 'credito liberado para pix%'
      and not exists (select 1 from public.transaction_semantic_overrides where transaction_id = c.id)
      and not exists (select 1 from public.transaction_links where c.id in (source_transaction_id, target_transaction_id))
      and not exists (select 1 from public.savings_movements where transaction_id = c.id)
      and not exists (select 1 from public.card_statement_entries where transaction_id = c.id)
    order by abs(c.event_date - debit.event_date), c.id
    limit 1;
    continue when credit.id is null;

    insert into public.transaction_semantic_overrides (owner_id, transaction_id, effective_nature, effective_reporting, reason)
    values
      (p_owner, debit.id, 'adjustment', 'neutral', 'auto_card_funded_pix'),
      (p_owner, credit.id, 'adjustment', 'neutral', 'auto_card_funded_pix');
    neutralized := neutralized + 1;
  end loop;
  return neutralized;
end;
$$;

revoke all on function public.internal_match_card_funded_pix(uuid) from public, anon, authenticated;
grant execute on function public.internal_match_card_funded_pix(uuid) to service_role;

create function private.match_card_funded_pix_after_insert() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare owner uuid;
begin
  if pg_trigger_depth() > 1 then return null; end if;
  for owner in select distinct owner_id from inserted_rows loop
    perform public.internal_match_card_funded_pix(owner);
  end loop;
  return null;
end;
$$;

revoke all on function private.match_card_funded_pix_after_insert() from public, anon, authenticated;

create trigger transactions_match_card_funded_pix
  after insert on public.transactions
  referencing new table as inserted_rows
  for each statement execute function private.match_card_funded_pix_after_insert();

-- Corrige o que já foi importado.
select public.internal_match_card_funded_pix(id) from public.profiles where is_owner;
