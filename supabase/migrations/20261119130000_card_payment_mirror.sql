-- D-053: o pagamento visto pelo cartão (“PGTO BOLETO …”, “PAGAMENTO COM SALDO”, “Pagamento recebido”) é espelho
-- do débito na conta, que é quem quita a fatura (D-050). Gravado como estorno, abatia o gasto do mês e o total da
-- fatura; gravado como pagamento, contava duas vezes. Passa a `adjustment` neutro e fora da fatura, como a linha
-- informativa. Mesmo mecanismo reversível da D-050: override automático com reason próprio, nunca sobre decisão
-- do proprietário. Sem “pag” sozinho: “PAG*LOJA” é estabelecimento e o estorno dele é estorno de verdade.

alter table public.transaction_semantic_overrides drop constraint transaction_semantic_overrides_reason_check;
alter table public.transaction_semantic_overrides add constraint transaction_semantic_overrides_reason_check
  check (reason in ('owner_confirmation', 'auto_statement_carryover', 'auto_card_payment_match', 'auto_card_payment_mirror'));

create or replace function public.internal_match_card_payments(p_owner_id uuid) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  carryovers integer := 0;
  matched integer := 0;
  candidate record;
  chosen uuid;
  chosen_count integer;
begin
  if p_owner_id is null then raise exception 'Owner required'; end if;

  -- 1. Linhas do cartão que não são compra: informativa da fatura anterior e espelho do pagamento (D-053)
  with targets as (
    select t.id,
      case when translate(lower(t.description), 'áàâãéêíóôõúç', 'aaaaeeiooouc') ~ '(total da fatura anterior|saldo (da )?fatura anterior|saldo anterior da fatura)'
        then 'auto_statement_carryover' else 'auto_card_payment_mirror' end as reason
    from public.transactions t
    join public.financial_accounts a on a.id = t.account_id and a.owner_id = t.owner_id
    where t.owner_id = p_owner_id and a.account_type = 'credit_card' and t.source = 'pluggy'
      and t.nature <> 'adjustment' and t.classification_status <> 'confirmed'
      and (translate(lower(t.description), 'áàâãéêíóôõúç', 'aaaaeeiooouc') ~ '(total da fatura anterior|saldo (da )?fatura anterior|saldo anterior da fatura)'
        or t.nature = 'card_payment'
        or (t.nature = 'refund' and translate(lower(t.description), 'áàâãéêíóôõúç', 'aaaaeeiooouc') ~ '^\s*(pagamento|pagto|pgto)\M'))
      and not exists (select 1 from public.transaction_semantic_overrides o where o.transaction_id = t.id)
      and not exists (select 1 from public.transaction_classifications c where c.transaction_id = t.id and c.status = 'confirmed')
  ), inserted as (
    insert into public.transaction_semantic_overrides (owner_id, transaction_id, effective_nature, effective_reporting, reason)
    select p_owner_id, id, 'adjustment', 'neutral', reason from targets
    returning transaction_id
  ), removed as (
    delete from public.card_statement_entries e using inserted i where e.transaction_id = i.transaction_id
    returning e.id
  )
  select count(*) into carryovers from inserted;
  delete from public.transaction_classifications c
  where c.owner_id = p_owner_id and c.status <> 'confirmed'
    and c.transaction_id in (
      select o.transaction_id from public.transaction_semantic_overrides o where o.owner_id = p_owner_id and o.effective_nature = 'adjustment'
      union all select t.id from public.transactions t where t.owner_id = p_owner_id and t.nature = 'adjustment' and t.source = 'pluggy');

  -- 2. Pagamentos da conta → fatura do mesmo banco
  for candidate in
    select t.id, t.amount_cents, t.event_date, pa.connection_id
    from public.transactions t
    join public.financial_accounts a on a.id = t.account_id and a.owner_id = t.owner_id
    join private.pluggy_accounts pa on pa.account_id = t.account_id and pa.owner_id = t.owner_id
    where t.owner_id = p_owner_id and t.source = 'pluggy' and a.account_type <> 'credit_card'
      and t.amount_cents < 0 and t.nature in ('expense', 'card_payment')
      and t.classification_status <> 'confirmed'
      and translate(lower(t.description), 'áàâãéêíóôõúç', 'aaaaeeiooouc') ~ '(boleto|fatura|cartao)'
      and not exists (select 1 from public.card_statement_entries e where e.transaction_id = t.id)
      and not exists (select 1 from public.transaction_semantic_overrides o where o.transaction_id = t.id)
  loop
    -- A lista foi lida no início; o gatilho das entradas de fatura pode ter reentrado e vinculado este candidato.
    if exists (select 1 from public.transaction_semantic_overrides o where o.transaction_id = candidate.id)
      or exists (select 1 from public.card_statement_entries e where e.transaction_id = candidate.id) then
      continue;
    end if;
    with statements as (
      select s.id, s.due_date, s.card_id,
        coalesce((select sum(abs(x.amount_cents)) from public.card_statement_entries e join public.transactions x on x.id = e.transaction_id
          where e.statement_id = s.id and e.entry_type = 'purchase'), 0)
        - coalesce((select sum(abs(x.amount_cents)) from public.card_statement_entries e join public.transactions x on x.id = e.transaction_id
          where e.statement_id = s.id and e.entry_type in ('refund', 'payment')), 0) as open_cents
      from public.card_statements s
      join public.credit_cards c on c.id = s.card_id and c.owner_id = s.owner_id
      join private.pluggy_accounts cpa on cpa.account_id = c.account_id and cpa.owner_id = c.owner_id
      where s.owner_id = p_owner_id and cpa.connection_id = candidate.connection_id
        and s.due_date between candidate.event_date - 12 and candidate.event_date + 20
    ), evidence as (
      select st.id, st.due_date from statements st
      where st.open_cents = abs(candidate.amount_cents)
         or exists (
           select 1 from public.transactions co
           join public.credit_cards cc on cc.account_id = co.account_id and cc.owner_id = co.owner_id
           left join public.transaction_semantic_overrides oo on oo.transaction_id = co.id
           where co.owner_id = p_owner_id and cc.id = st.card_id and co.source = 'pluggy'
             and (co.nature = 'adjustment' or oo.effective_nature = 'adjustment')
             and abs(co.amount_cents) = abs(candidate.amount_cents)
             and co.event_date between candidate.event_date - 20 and candidate.event_date + 5)
    ), ranked as (
      select id, abs(due_date - candidate.event_date) as distance from evidence
    )
    select (array_agg(id order by distance))[1],
      count(*) filter (where distance = (select min(distance) from ranked))
    into chosen, chosen_count from ranked;

    if chosen is null or chosen_count <> 1 then continue; end if;

    insert into public.transaction_semantic_overrides (owner_id, transaction_id, effective_nature, effective_reporting, statement_id, reason)
    values (p_owner_id, candidate.id, 'card_payment', 'neutral', chosen, 'auto_card_payment_match');
    delete from public.transaction_classifications where transaction_id = candidate.id and owner_id = p_owner_id and status <> 'confirmed';
    insert into public.card_statement_entries (owner_id, statement_id, transaction_id, entry_type)
    values (p_owner_id, chosen, candidate.id, 'payment') on conflict (transaction_id) do nothing;
    matched := matched + 1;
  end loop;

  return jsonb_build_object('carryovers', carryovers, 'matched', matched);
end;
$$;

revoke all on function public.internal_match_card_payments(uuid) from public, anon, authenticated;
grant execute on function public.internal_match_card_payments(uuid) to service_role;

-- Correção dos dados existentes (proprietário único). Recalculadas as faturas, o passo 2 pode vincular
-- pagamentos da conta que antes não tinham evidência única.
select public.internal_match_card_payments(id) from public.profiles;
