-- D-071: Pix no credito para o proprio titular (sai do Nubank pago com o cartao e chega no Itau). O lado que chega
-- contava como receita; agora fica neutro como a saida. Arquivo so em ASCII (D-069).

create or replace function public.internal_match_card_funded_pix(p_owner uuid) returns integer
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare
  debit public.transactions%rowtype;
  credit public.transactions%rowtype;
  neutralized integer := 0;
  holder text;
  first_name text;
  last_name text;
  mate public.transactions%rowtype;
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

  -- D-071: Pix no credito para voce mesmo. A saida (ja neutra acima) leva o nome do titular; o lado que chega na
  -- outra conta conectada tambem e neutro: quem conta e a compra na fatura, nao uma receita.
  select private.normalize_classification_text(holder_name) into holder from public.profiles where id = p_owner;
  first_name := split_part(coalesce(holder, ''), ' ', 1);
  last_name := regexp_replace(coalesce(holder, ''), '^.* ', '');
  if coalesce(holder, '') <> '' and first_name <> last_name then
    for debit in
      select t.* from public.transactions t
      join public.transaction_semantic_overrides o on o.transaction_id = t.id and o.reason = 'auto_card_funded_pix'
      where t.owner_id = p_owner and t.amount_cents < 0 and t.source_deleted_at is null
        and (' ' || private.normalize_classification_text(t.description) || ' ') like '% ' || first_name || ' %'
        and (' ' || private.normalize_classification_text(t.description) || ' ') like '% ' || last_name || ' %'
        -- Uma vez so: se o lado que chega ja foi neutralizado, nao procura outro.
        and not exists (select 1 from public.transactions arrived
          join public.transaction_semantic_overrides ao on ao.transaction_id = arrived.id and ao.reason = 'auto_card_funded_pix'
          where arrived.owner_id = p_owner and arrived.account_id <> t.account_id and arrived.amount_cents = -t.amount_cents
            and abs(arrived.event_date - t.event_date) <= 3)
      order by t.event_date, t.id
    loop
      mate := null;
      select c.* into mate
      from public.transactions c
      join public.financial_accounts account on account.id = c.account_id
      where c.owner_id = p_owner and c.source = 'pluggy' and c.source_deleted_at is null
        and c.account_id <> debit.account_id and account.account_type <> 'credit_card'
        and c.amount_cents = -debit.amount_cents and abs(c.event_date - debit.event_date) <= 3
        and not exists (select 1 from public.transaction_semantic_overrides where transaction_id = c.id)
        and not exists (select 1 from public.transaction_links where c.id in (source_transaction_id, target_transaction_id))
        and not exists (select 1 from public.savings_movements where transaction_id = c.id)
        and not exists (select 1 from public.card_statement_entries where transaction_id = c.id)
      order by abs(c.event_date - debit.event_date), c.id
      limit 1;
      continue when mate.id is null;
      insert into public.transaction_semantic_overrides (owner_id, transaction_id, effective_nature, effective_reporting, reason)
      values (p_owner, mate.id, 'adjustment', 'neutral', 'auto_card_funded_pix');
      neutralized := neutralized + 1;
    end loop;
  end if;
  return neutralized;
end;
$$;

select public.internal_match_card_funded_pix(id) from public.profiles where is_owner;
