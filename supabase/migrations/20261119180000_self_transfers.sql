-- D-062: Pix para o próprio titular. O nome do titular fica no perfil (editado em Conta). Um Pix importado com
-- nome e sobrenome do titular na descrição:
--   * com o outro lado numa conta conectada (mesmo valor, sinal oposto, até 3 dias) → transferência própria, os dois
--     lados vinculados;
--   * sem o outro lado (conta fora do app, ex.: Nubank) → neutro (`adjustment`): não conta como receita nem despesa.
-- Roda a cada importação (gatilho) e sobre o histórico quando o dono salva o nome. Nunca mexe em lançamento que já
-- tem decisão (override, vínculo, caixinha ou fatura).

alter table public.profiles
  add column holder_name text check (holder_name is null or char_length(holder_name) between 3 and 120);

alter table public.transaction_semantic_overrides
  drop constraint transaction_semantic_overrides_reason_check,
  add constraint transaction_semantic_overrides_reason_check check (reason in (
    'owner_confirmation', 'auto_statement_carryover', 'auto_card_payment_match', 'auto_card_payment_mirror', 'auto_self_transfer'
  ));

create function public.internal_match_self_transfers(p_owner uuid) returns jsonb
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
  -- Nome e sobrenome são obrigatórios: só o sobrenome casaria Pix de parentes.
  if coalesce(holder, '') = '' or first_name = last_name then
    return jsonb_build_object('paired', 0, 'neutralized', 0);
  end if;

  for item in
    select t.* from public.transactions t
    where t.owner_id = p_owner and t.source = 'pluggy' and t.source_deleted_at is null
      and (' ' || private.normalize_classification_text(t.description) || ' ') like '% pix %'
      and (' ' || private.normalize_classification_text(t.description) || ' ') like '% ' || first_name || ' %'
      and (' ' || private.normalize_classification_text(t.description) || ' ') like '% ' || last_name || ' %'
    order by t.event_date, t.id
  loop
    -- Revalida a cada volta: o par de um item anterior pode ser este.
    continue when exists (select 1 from public.transaction_semantic_overrides where transaction_id = item.id)
      or exists (select 1 from public.transaction_links where link_type = 'own_transfer' and item.id in (source_transaction_id, target_transaction_id))
      or exists (select 1 from public.savings_movements where transaction_id = item.id)
      or exists (select 1 from public.card_statement_entries where transaction_id = item.id);

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

revoke all on function public.internal_match_self_transfers(uuid) from public, anon, authenticated;
grant execute on function public.internal_match_self_transfers(uuid) to service_role;

create function public.set_holder_name(p_name text) returns jsonb
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare current_owner uuid := private.require_owner();
begin
  p_name := nullif(regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g'), '');
  if p_name is not null and char_length(p_name) not between 3 and 120 then
    raise exception 'Holder name must have between 3 and 120 characters';
  end if;
  update public.profiles set holder_name = p_name where id = current_owner;
  return public.internal_match_self_transfers(current_owner);
end;
$$;

revoke all on function public.set_holder_name(text) from public, anon;
grant execute on function public.set_holder_name(text) to authenticated;

create function private.match_self_transfers_after_insert() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare owner uuid;
begin
  if pg_trigger_depth() > 1 then return null; end if;
  for owner in select distinct owner_id from inserted_rows loop
    perform public.internal_match_self_transfers(owner);
  end loop;
  return null;
end;
$$;

revoke all on function private.match_self_transfers_after_insert() from public, anon, authenticated;

create trigger transactions_match_self_transfers
  after insert on public.transactions
  referencing new table as inserted_rows
  for each statement execute function private.match_self_transfers_after_insert();
