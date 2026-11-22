-- D-073: Pix no credito para o proprio titular. O cartao cobra o valor do Pix mais o custo do credito; o dinheiro
-- chega numa conta sua (neutro, D-071). A cobranca vira transferencia (o gasto real e o que voce fizer depois com o
-- dinheiro) e o custo (cobranca - valor recebido) vira uma despesa "Juros do Pix no credito" em Tarifas e juros,
-- criada sozinha. Uma linha de ajuste igual e contraria mantem o saldo do cartao igual ao do banco.
-- Roda a cada importacao e sobre o historico. Arquivo so em ASCII (D-069).

create function public.internal_split_self_pix_credit_fees(p_owner uuid) returns integer
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare
  holder text;
  first_name text;
  last_name text;
  charge public.transactions%rowtype;
  funding public.transactions%rowtype;
  sent public.transactions%rowtype;
  fee bigint;
  split integer := 0;
  fee_label text := 'Juros do Pix no cr' || chr(233) || 'dito';
  offset_label text := 'Ajuste: juros j' || chr(225) || ' inclu' || chr(237) || 'dos na cobran' || chr(231) || 'a do Pix';
begin
  select private.normalize_classification_text(holder_name) into holder from public.profiles where id = p_owner;
  first_name := split_part(coalesce(holder, ''), ' ', 1);
  last_name := regexp_replace(coalesce(holder, ''), '^.* ', '');
  if coalesce(holder, '') = '' or first_name = last_name then return 0; end if;

  for funding in
    select v.* from public.transactions v
    join public.transaction_semantic_overrides vo on vo.transaction_id = v.id and vo.reason = 'auto_card_funded_pix'
    where v.owner_id = p_owner and v.amount_cents > 0 and v.source_deleted_at is null
      and private.normalize_classification_text(v.description) like 'valor adicionado na conta por cartao de credito%'
      and not exists (select 1 from public.transaction_semantic_overrides used where used.counterpart_transaction_id = v.id)
    order by v.event_date, v.id
  loop
    -- A saida do mesmo valor, no mesmo dia e na mesma conta, foi para o proprio titular?
    sent := null;
    select d.* into sent from public.transactions d
    join public.transaction_semantic_overrides dov on dov.transaction_id = d.id and dov.reason = 'auto_card_funded_pix'
    where d.owner_id = p_owner and d.account_id = funding.account_id and d.amount_cents = -funding.amount_cents
      and abs(d.event_date - funding.event_date) <= 1
      and (' ' || private.normalize_classification_text(d.description) || ' ') like '% ' || first_name || ' %'
      and (' ' || private.normalize_classification_text(d.description) || ' ') like '% ' || last_name || ' %'
    order by abs(d.event_date - funding.event_date), d.id limit 1;
    continue when sent.id is null;

    -- A cobranca no cartao: mesmo dia (ate 1), valor >= ao recebido e no maximo 50% acima.
    charge := null;
    select c.* into charge from public.transactions c
    join public.financial_accounts account on account.id = c.account_id and account.account_type = 'credit_card'
    where c.owner_id = p_owner and c.source = 'pluggy' and c.source_deleted_at is null and c.nature = 'expense'
      and -c.amount_cents >= funding.amount_cents and -c.amount_cents <= funding.amount_cents * 3 / 2
      and abs(c.event_date - funding.event_date) <= 1
      and not exists (select 1 from public.transaction_semantic_overrides where transaction_id = c.id)
    order by abs(c.event_date - funding.event_date), abs(-c.amount_cents - funding.amount_cents), c.id limit 1;
    continue when charge.id is null;

    insert into public.transaction_semantic_overrides (owner_id, transaction_id, effective_nature, effective_reporting, counterpart_transaction_id, reason)
    values (p_owner, charge.id, 'own_transfer', 'neutral', funding.id, 'auto_card_funded_pix');

    fee := -charge.amount_cents - funding.amount_cents;
    if fee > 0 then
      -- Linhas manuais (sem external_key); nao se repetem porque a cobranca ja ganhou a correcao acima.
      insert into public.transactions (owner_id, account_id, category_id, description, amount_cents, nature, reporting, source,
        event_date, competence, classification_status)
      values
        (p_owner, charge.account_id, 'fees_interest', fee_label, -fee, 'expense', 'expense', 'manual',
          charge.event_date, charge.competence, 'automatic'),
        (p_owner, charge.account_id, null, offset_label, fee, 'adjustment', 'neutral', 'manual',
          charge.event_date, charge.competence, 'automatic');
    end if;
    split := split + 1;
  end loop;
  return split;
end;
$$;

revoke all on function public.internal_split_self_pix_credit_fees(uuid) from public, anon, authenticated;
grant execute on function public.internal_split_self_pix_credit_fees(uuid) to service_role;

create function private.split_self_pix_credit_fees_after_insert() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare owner uuid;
begin
  if pg_trigger_depth() > 1 then return null; end if;
  for owner in select distinct owner_id from inserted_rows loop
    perform public.internal_split_self_pix_credit_fees(owner);
  end loop;
  return null;
end;
$$;

revoke all on function private.split_self_pix_credit_fees_after_insert() from public, anon, authenticated;

create trigger transactions_split_self_pix_credit_fees
  after insert on public.transactions
  referencing new table as inserted_rows
  for each statement execute function private.split_self_pix_credit_fees_after_insert();

select public.internal_split_self_pix_credit_fees(id) from public.profiles where is_owner;
