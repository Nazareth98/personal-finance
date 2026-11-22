-- D-070: Nubank conectado.
-- 1) Pix no credito do Nubank ("Valor adicionado na conta por cartao de credito" + a transferencia que sai no mesmo
--    dia, mesmo valor): os dois lados ficam neutros, como o Pix com cartao do Itau (D-063); quem conta e a fatura.
-- 2) Transferencia propria: o Nubank descreve "Transferencia recebida/enviada | NOME" sem a palavra Pix, entao
--    "transferencia"/"transf" tambem valem. E um lado que ja tinha sido neutralizado sem par (o outro banco ainda
--    nao estava conectado) agora ganha o par: os dois viram transferencia propria vinculada.
-- Arquivo so em ASCII (D-069). Roda tambem sobre o historico de quem ja tem nome de titular.

create or replace function public.internal_match_card_funded_pix(p_owner uuid) returns integer
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
      and (private.normalize_classification_text(t.description) like 'pix enviado com cartao%'
        or exists (select 1 from public.transactions funding where funding.owner_id = p_owner and funding.account_id = t.account_id
          and funding.source_deleted_at is null and funding.amount_cents = -t.amount_cents and abs(funding.event_date - t.event_date) <= 1
          and private.normalize_classification_text(funding.description) like 'valor adicionado na conta por cartao de credito%'))
      and not exists (select 1 from public.transaction_semantic_overrides where transaction_id = t.id)
      and not exists (select 1 from public.transaction_links where t.id in (source_transaction_id, target_transaction_id))
      and not exists (select 1 from public.savings_movements where transaction_id = t.id)
      and not exists (select 1 from public.card_statement_entries where transaction_id = t.id)
    order by t.event_date, t.id
  loop
    credit := null;
    select c.* into credit
    from public.transactions c
    where c.owner_id = p_owner and c.source = 'pluggy' and c.source_deleted_at is null
      and c.account_id = debit.account_id and c.amount_cents = -debit.amount_cents
      and abs(c.event_date - debit.event_date) <= 1
      and (private.normalize_classification_text(c.description) like 'credito liberado para pix%'
        or private.normalize_classification_text(c.description) like 'valor adicionado na conta por cartao de credito%')
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

create or replace function public.internal_match_self_transfers(p_owner uuid) returns jsonb
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare
  holder text;
  first_name text;
  last_name text;
  item public.transactions%rowtype;
  mate public.transactions%rowtype;
  paired integer := 0;
  neutralized integer := 0;
begin
  select private.normalize_classification_text(holder_name) into holder from public.profiles where id = p_owner;
  first_name := split_part(coalesce(holder, ''), ' ', 1);
  last_name := regexp_replace(coalesce(holder, ''), '^.* ', '');
  -- Nome e sobrenome sao obrigatorios: so o sobrenome casaria Pix de parentes.
  if coalesce(holder, '') = '' or first_name = last_name then
    return jsonb_build_object('paired', 0, 'neutralized', 0);
  end if;

  -- D-070: um lado neutralizado sem par (o outro banco ainda nao estava conectado) ganha o par quando ele chega.
  for item in
    select t.* from public.transactions t
    join public.transaction_semantic_overrides o on o.transaction_id = t.id
    where t.owner_id = p_owner and t.source_deleted_at is null
      and o.reason = 'auto_self_transfer' and o.effective_nature = 'adjustment' and o.counterpart_transaction_id is null
    order by t.event_date, t.id
  loop
    continue when not exists (select 1 from public.transaction_semantic_overrides o2 where o2.transaction_id = item.id
      and o2.reason = 'auto_self_transfer' and o2.effective_nature = 'adjustment' and o2.counterpart_transaction_id is null);
    mate := null;
    select c.* into mate
    from public.transactions c
    join public.financial_accounts account on account.id = c.account_id
    left join public.transaction_semantic_overrides mo on mo.transaction_id = c.id
    where c.owner_id = p_owner and c.source = 'pluggy' and c.source_deleted_at is null
      and c.id <> item.id and c.account_id <> item.account_id and account.account_type <> 'credit_card'
      and c.amount_cents = -item.amount_cents and abs(c.event_date - item.event_date) <= 3
      and (mo.id is null or (mo.reason = 'auto_self_transfer' and mo.effective_nature = 'adjustment' and mo.counterpart_transaction_id is null))
      and not exists (select 1 from public.transaction_links where link_type = 'own_transfer' and c.id in (source_transaction_id, target_transaction_id))
      and not exists (select 1 from public.savings_movements where transaction_id = c.id)
      and not exists (select 1 from public.card_statement_entries where transaction_id = c.id)
      and ((' ' || private.normalize_classification_text(c.description) || ' ') like '% pix %'
        or (' ' || private.normalize_classification_text(c.description) || ' ') like '% transferencia %'
        or (' ' || private.normalize_classification_text(c.description) || ' ') like '% transf %')
    order by abs(c.event_date - item.event_date), c.id
    limit 1;
    continue when mate.id is null;
    update public.transaction_semantic_overrides
      set effective_nature = 'own_transfer', effective_reporting = 'neutral', counterpart_transaction_id = mate.id, updated_at = now()
      where transaction_id = item.id;
    if exists (select 1 from public.transaction_semantic_overrides where transaction_id = mate.id) then
      update public.transaction_semantic_overrides
        set effective_nature = 'own_transfer', effective_reporting = 'neutral', counterpart_transaction_id = item.id, updated_at = now()
        where transaction_id = mate.id;
    else
      insert into public.transaction_semantic_overrides (owner_id, transaction_id, effective_nature, effective_reporting, counterpart_transaction_id, reason)
      values (p_owner, mate.id, 'own_transfer', 'neutral', item.id, 'auto_self_transfer');
    end if;
    insert into public.transaction_links (owner_id, source_transaction_id, target_transaction_id, link_type)
    values (p_owner,
      case when item.amount_cents < 0 then item.id else mate.id end,
      case when item.amount_cents < 0 then mate.id else item.id end,
      'own_transfer');
    paired := paired + 1;
  end loop;

  for item in
    select t.* from public.transactions t
    where t.owner_id = p_owner and t.source = 'pluggy' and t.source_deleted_at is null
      and ((' ' || private.normalize_classification_text(t.description) || ' ') like '% pix %'
        or (' ' || private.normalize_classification_text(t.description) || ' ') like '% transferencia %'
        or (' ' || private.normalize_classification_text(t.description) || ' ') like '% transf %')
      and (' ' || private.normalize_classification_text(t.description) || ' ') like '% ' || first_name || ' %'
      and (' ' || private.normalize_classification_text(t.description) || ' ') like '% ' || last_name || ' %'
    order by t.event_date, t.id
  loop
    -- Revalida a cada volta: o par de um item anterior pode ser este.
    continue when exists (select 1 from public.transaction_semantic_overrides where transaction_id = item.id)
      or exists (select 1 from public.transaction_links where link_type = 'own_transfer' and item.id in (source_transaction_id, target_transaction_id))
      or exists (select 1 from public.savings_movements where transaction_id = item.id)
      or exists (select 1 from public.card_statement_entries where transaction_id = item.id);

    mate := null;
    select c.* into mate
    from public.transactions c
    join public.financial_accounts account on account.id = c.account_id
    where c.owner_id = p_owner and c.source = 'pluggy' and c.source_deleted_at is null
      and c.id <> item.id and c.account_id <> item.account_id and account.account_type <> 'credit_card'
      and c.amount_cents = -item.amount_cents and abs(c.event_date - item.event_date) <= 3
      and not exists (select 1 from public.transaction_semantic_overrides where transaction_id = c.id)
      and not exists (select 1 from public.transaction_links where link_type = 'own_transfer' and c.id in (source_transaction_id, target_transaction_id))
      and not exists (select 1 from public.savings_movements where transaction_id = c.id)
      and not exists (select 1 from public.card_statement_entries where transaction_id = c.id)
    order by abs(c.event_date - item.event_date), c.id
    limit 1;

    if mate.id is not null then
      insert into public.transaction_semantic_overrides (
        owner_id, transaction_id, effective_nature, effective_reporting, counterpart_transaction_id, reason
      ) values
        (p_owner, item.id, 'own_transfer', 'neutral', mate.id, 'auto_self_transfer'),
        (p_owner, mate.id, 'own_transfer', 'neutral', item.id, 'auto_self_transfer');
      insert into public.transaction_links (owner_id, source_transaction_id, target_transaction_id, link_type)
      values (
        p_owner,
        case when item.amount_cents < 0 then item.id else mate.id end,
        case when item.amount_cents < 0 then mate.id else item.id end,
        'own_transfer'
      );
      paired := paired + 1;
    else
      insert into public.transaction_semantic_overrides (
        owner_id, transaction_id, effective_nature, effective_reporting, reason
      ) values (p_owner, item.id, 'adjustment', 'neutral', 'auto_self_transfer');
      neutralized := neutralized + 1;
    end if;
  end loop;

  return jsonb_build_object('paired', paired, 'neutralized', neutralized);
end;
$$;

select public.internal_match_card_funded_pix(id) from public.profiles where is_owner;
select public.internal_match_self_transfers(id) from public.profiles where is_owner and holder_name is not null;
