-- D-054: fatura pela informação do banco e pagamento na primeira fatura que vence a partir dele.
--
-- 1. Parcelas chegam do MeuPluggy com a data da compra original; pela data, caíam numa fatura antiga (Itaú com
--    faturas a 11% e 214% pagas). O banco informa a fatura de cada compra (billId): todas as compras de um billId
--    ficam na competência da compra mais recente dele. Também aplica o calendário atual do cartão (fechamento).
-- 2. Pagamento quitava a fatura de vencimento mais próximo, olhando só até 20 dias à frente; pagamento feito depois
--    do vencimento (25/08) ia para a fatura já vencida. Agora: a primeira fatura que vence a partir do pagamento,
--    com 3 dias de tolerância para atraso, até 40 dias à frente. Vínculos automáticos são refeitos; os do
--    proprietário ficam.
-- `competence` do lançamento importado é derivada (mês da fatura), não dado do banco: só o backend pode corrigi-la.

create or replace function private.prevent_imported_transaction_mutation() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if old.source = 'pluggy' then
    if tg_op = 'UPDATE'
      and new.source = 'pluggy'
      and (to_jsonb(new) - 'source_deleted_at' - 'competence') = (to_jsonb(old) - 'source_deleted_at' - 'competence')
      and (new.competence = old.competence or auth.uid() is null) then
      return new;
    end if;
    raise exception 'Imported transactions are immutable';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.prevent_imported_transaction_mutation() from public, anon, authenticated;

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
        and s.due_date between candidate.event_date - 3 and candidate.event_date + 40
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
      select id, due_date - candidate.event_date as distance from evidence
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

-- Dia do mês limitado ao último dia (fechamento 31 em fevereiro), como `cardStatementDates`.
create function pg_temp.d054_day(month_start date, day_of_month integer) returns date language sql immutable as $$
  select (month_start + make_interval(days => least(day_of_month, extract(day from month_start + interval '1 month - 1 day')::integer) - 1))::date
$$;

-- Competência de cada compra/estorno: pelo calendário atual do cartão e, com billId, a mais recente do billId.
create temp table d054_target as
with items as (
  select distinct on (e.id) e.id as entry_id, x.owner_id, x.id as transaction_id, c.id as card_id, pt.provider_bill_id as bill,
    to_char(date_trunc('month', x.event_date) + make_interval(months =>
      (extract(day from x.event_date) > c.closing_day)::integer + (c.due_day <= c.closing_day)::integer), 'YYYY-MM') as base
  from public.card_statement_entries e
  join public.transactions x on x.id = e.transaction_id and x.owner_id = e.owner_id
  join public.credit_cards c on c.account_id = x.account_id and c.owner_id = x.owner_id
  left join private.pluggy_transactions pt on pt.owner_id = x.owner_id and 'pluggy:' || pt.external_transaction_id = x.external_key
  where e.entry_type in ('purchase', 'refund') and x.source = 'pluggy' and c.closing_day is not null and c.due_day is not null
  order by e.id, pt.created_at desc
)
select entry_id, owner_id, transaction_id, card_id,
  case when bill is null then base else max(base) over (partition by card_id, bill) end as competence
from items;

-- Faturas: datas pelo calendário atual; cria as competências que passaram a ter compras.
update public.card_statements s set
  closing_date = pg_temp.d054_day((to_date(s.competence, 'YYYY-MM') - make_interval(months => (c.due_day <= c.closing_day)::integer))::date, c.closing_day),
  due_date = pg_temp.d054_day(to_date(s.competence, 'YYYY-MM'), c.due_day),
  updated_at = now()
from public.credit_cards c
where c.id = s.card_id and c.closing_day is not null and c.due_day is not null;

insert into public.card_statements (owner_id, card_id, competence, closing_date, due_date)
select distinct t.owner_id, t.card_id, t.competence,
  pg_temp.d054_day((to_date(t.competence, 'YYYY-MM') - make_interval(months => (c.due_day <= c.closing_day)::integer))::date, c.closing_day),
  pg_temp.d054_day(to_date(t.competence, 'YYYY-MM'), c.due_day)
from d054_target t join public.credit_cards c on c.id = t.card_id
on conflict (owner_id, card_id, competence) do nothing;

update public.card_statement_entries e set statement_id = s.id
from d054_target t
join public.card_statements s on s.owner_id = t.owner_id and s.card_id = t.card_id and s.competence = t.competence
where e.id = t.entry_id and e.statement_id <> s.id;

update public.transactions x set competence = t.competence
from d054_target t
where x.id = t.transaction_id and x.competence <> t.competence;

-- Parcelas lançadas acompanham a compra; as projetadas seguem a última lançada do mesmo grupo.
update public.card_installments i set statement_id = s.id, due_competence = t.competence, updated_at = now()
from d054_target t
join public.card_statements s on s.owner_id = t.owner_id and s.card_id = t.card_id and s.competence = t.competence
where i.transaction_id = t.transaction_id and (i.statement_id <> s.id or i.due_competence <> t.competence);

create temp table d054_projected as
with anchor as (
  select distinct on (owner_id, purchase_group_key) owner_id, purchase_group_key, installment_number, due_competence
  from public.card_installments where status = 'posted'
  order by owner_id, purchase_group_key, installment_number desc
)
select i.id, i.owner_id, i.card_id,
  to_char(to_date(a.due_competence, 'YYYY-MM') + make_interval(months => i.installment_number - a.installment_number), 'YYYY-MM') as competence
from public.card_installments i
join anchor a on a.owner_id = i.owner_id and a.purchase_group_key = i.purchase_group_key
where i.status = 'projected' and i.installment_number > a.installment_number;

insert into public.card_statements (owner_id, card_id, competence, closing_date, due_date)
select distinct p.owner_id, p.card_id, p.competence,
  pg_temp.d054_day((to_date(p.competence, 'YYYY-MM') - make_interval(months => (c.due_day <= c.closing_day)::integer))::date, c.closing_day),
  pg_temp.d054_day(to_date(p.competence, 'YYYY-MM'), c.due_day)
from d054_projected p join public.credit_cards c on c.id = p.card_id
where c.closing_day is not null and c.due_day is not null
on conflict (owner_id, card_id, competence) do nothing;

update public.card_installments i set statement_id = s.id, due_competence = p.competence, updated_at = now()
from d054_projected p
join public.card_statements s on s.owner_id = p.owner_id and s.card_id = p.card_id and s.competence = p.competence
where i.id = p.id and i.due_competence <> p.competence;

-- Refaz os vínculos automáticos com a regra nova (o histórico guarda os anteriores); os do proprietário ficam.
delete from public.card_statement_entries e
using public.transaction_semantic_overrides o
where o.transaction_id = e.transaction_id and o.reason = 'auto_card_payment_match' and e.entry_type = 'payment';
delete from public.transaction_semantic_overrides where reason = 'auto_card_payment_match';

select public.internal_match_card_payments(id) from public.profiles;

drop table d054_target, d054_projected;
