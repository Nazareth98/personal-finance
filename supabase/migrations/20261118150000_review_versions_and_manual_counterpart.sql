-- Etapa 11.2: decisões substituídas ficam no histórico e transferência própria pode registrar o lado ausente.

create table public.transaction_review_history (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  transaction_id uuid not null,
  decision_type text not null check (decision_type in ('semantics', 'classification')),
  previous jsonb not null,
  superseded_at timestamptz not null default now(),
  constraint review_history_transaction_owner
    foreign key (transaction_id, owner_id) references public.transactions(id, owner_id) on delete cascade
);

create index review_history_transaction_owner
  on public.transaction_review_history (transaction_id, owner_id, superseded_at desc);

alter table public.transaction_review_history enable row level security;
revoke all on table public.transaction_review_history from anon, authenticated;
grant select on table public.transaction_review_history to authenticated;
create policy "owner reads review history" on public.transaction_review_history
  for select to authenticated using (owner_id = (select auth.uid()));

create function private.record_superseded_semantics() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.transaction_review_history (owner_id, transaction_id, decision_type, previous)
  values (old.owner_id, old.transaction_id, 'semantics', jsonb_build_object(
    'nature', old.effective_nature, 'counterpartTransactionId', old.counterpart_transaction_id,
    'statementId', old.statement_id, 'savingsBoxId', old.savings_box_id,
    'semanticVersion', old.semantic_version, 'decidedAt', old.updated_at
  ));
  return old;
end;
$$;

create trigger semantic_overrides_keep_history
before delete on public.transaction_semantic_overrides
for each row execute function private.record_superseded_semantics();

-- Somente decisões confirmadas pelo proprietário viram versão; sugestões automáticas não são histórico.
create function private.record_superseded_classification() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if old.status = 'confirmed' and old.category_id is distinct from new.category_id then
    insert into public.transaction_review_history (owner_id, transaction_id, decision_type, previous)
    values (old.owner_id, old.transaction_id, 'classification', jsonb_build_object(
      'categoryId', old.category_id, 'classifierVersion', old.classifier_version, 'decidedAt', old.updated_at
    ));
  end if;
  return new;
end;
$$;

create trigger classifications_keep_history
before update on public.transaction_classifications
for each row execute function private.record_superseded_classification();

revoke all on function private.record_superseded_semantics() from public, anon, authenticated;
revoke all on function private.record_superseded_classification() from public, anon, authenticated;

drop function public.confirm_transaction_semantics(uuid, text, uuid, uuid, uuid);

create function public.confirm_transaction_semantics(
  p_transaction_id uuid,
  p_effective_nature text,
  p_counterpart_transaction_id uuid default null,
  p_statement_id uuid default null,
  p_savings_box_id uuid default null,
  p_counterpart_account_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  current_owner uuid := auth.uid();
  transaction_row public.transactions%rowtype;
  counterpart_row public.transactions%rowtype;
  counterpart_id uuid;
  previous_counterpart_id uuid;
  effective_reporting text;
  movement_type text;
  movement_amount bigint;
  box_balance bigint;
  override_id uuid;
begin
  if current_owner is null then raise exception 'Authentication required'; end if;
  if p_effective_nature not in (
    'income', 'expense', 'own_transfer', 'card_payment', 'savings_contribution', 'savings_withdrawal'
  ) then raise exception 'Invalid effective nature'; end if;
  if p_counterpart_account_id is not null and p_effective_nature <> 'own_transfer' then
    raise exception 'Counterpart account is only accepted for an own transfer';
  end if;

  select * into transaction_row
  from public.transactions
  where id = p_transaction_id and owner_id = current_owner and source = 'pluggy'
  for update;
  if transaction_row.id is null then raise exception 'Imported transaction not available'; end if;

  select counterpart_transaction_id into previous_counterpart_id
  from public.transaction_semantic_overrides
  where transaction_id = p_transaction_id and owner_id = current_owner and effective_nature = 'own_transfer';

  delete from public.transaction_links
  where owner_id = current_owner and link_type = 'own_transfer'
    and (source_transaction_id = p_transaction_id or target_transaction_id = p_transaction_id);
  delete from public.savings_movements
  where owner_id = current_owner and transaction_id = p_transaction_id;
  delete from public.card_statement_entries
  where owner_id = current_owner and transaction_id = p_transaction_id and entry_type = 'payment';
  delete from public.transaction_semantic_overrides
  where owner_id = current_owner and (
    transaction_id = p_transaction_id
    or (previous_counterpart_id is not null and transaction_id = previous_counterpart_id
      and effective_nature = 'own_transfer' and counterpart_transaction_id = p_transaction_id)
  );
  -- O lado manual só existe para completar a transferência substituída; mantê-lo alteraria o saldo do destino.
  if previous_counterpart_id is not null then
    delete from public.transactions
    where id = previous_counterpart_id and owner_id = current_owner and source = 'manual';
  end if;

  if p_effective_nature = 'income' then
    if transaction_row.amount_cents <= 0 then raise exception 'Income requires a positive transaction'; end if;
    if p_counterpart_transaction_id is not null or p_statement_id is not null or p_savings_box_id is not null then
      raise exception 'Income does not accept a related record';
    end if;
    effective_reporting := 'income';
  elsif p_effective_nature = 'expense' then
    if transaction_row.amount_cents >= 0 then raise exception 'Expense requires a negative transaction'; end if;
    if p_counterpart_transaction_id is not null or p_statement_id is not null or p_savings_box_id is not null then
      raise exception 'Expense does not accept a related record';
    end if;
    effective_reporting := 'expense';
  elsif p_effective_nature = 'own_transfer' then
    if p_statement_id is not null or p_savings_box_id is not null
      or (p_counterpart_transaction_id is null) = (p_counterpart_account_id is null) then
      raise exception 'Own transfer requires exactly one counterpart transaction or account';
    end if;

    if p_counterpart_account_id is not null then
      perform 1 from public.financial_accounts account
      where account.id = p_counterpart_account_id and account.owner_id = current_owner
        and account.archived_at is null and account.account_type <> 'credit_card'
        and account.id <> transaction_row.account_id
        and not exists (select 1 from private.pluggy_accounts linked where linked.account_id = account.id);
      if not found then raise exception 'Counterpart account not available'; end if;

      insert into public.transactions (
        owner_id, account_id, category_id, description, amount_cents, nature, reporting, source,
        event_date, competence, classification_status
      ) values (
        current_owner, p_counterpart_account_id, 'transfers', transaction_row.description, -transaction_row.amount_cents,
        'own_transfer', 'neutral', 'manual', transaction_row.event_date, transaction_row.competence, 'confirmed'
      ) returning id into counterpart_id;

      insert into public.transaction_semantic_overrides (
        owner_id, transaction_id, effective_nature, effective_reporting, counterpart_transaction_id
      ) values (current_owner, transaction_row.id, 'own_transfer', 'neutral', counterpart_id);
    else
      select * into counterpart_row
      from public.transactions
      where id = p_counterpart_transaction_id and owner_id = current_owner and source = 'pluggy'
      for update;
      if counterpart_row.id is null or counterpart_row.id = transaction_row.id then
        raise exception 'Counterpart transaction not available';
      end if;
      if counterpart_row.account_id = transaction_row.account_id
        or counterpart_row.amount_cents + transaction_row.amount_cents <> 0
        or abs(counterpart_row.event_date - transaction_row.event_date) > 3 then
        raise exception 'Counterpart transaction does not match the transfer';
      end if;
      if exists (
        select 1 from public.transaction_semantic_overrides
        where owner_id = current_owner and transaction_id = counterpart_row.id
      ) or exists (
        select 1 from public.transaction_links
        where owner_id = current_owner and link_type = 'own_transfer'
          and (source_transaction_id = counterpart_row.id or target_transaction_id = counterpart_row.id)
      ) or exists (
        select 1 from public.savings_movements where owner_id = current_owner and transaction_id = counterpart_row.id
      ) or exists (
        select 1 from public.card_statement_entries where owner_id = current_owner and transaction_id = counterpart_row.id
      ) then raise exception 'Counterpart transaction already has a semantic link'; end if;

      counterpart_id := counterpart_row.id;
      insert into public.transaction_semantic_overrides (
        owner_id, transaction_id, effective_nature, effective_reporting, counterpart_transaction_id
      ) values
        (current_owner, transaction_row.id, 'own_transfer', 'neutral', counterpart_id),
        (current_owner, counterpart_id, 'own_transfer', 'neutral', transaction_row.id);
    end if;

    insert into public.transaction_links (owner_id, source_transaction_id, target_transaction_id, link_type)
    values (
      current_owner,
      case when transaction_row.amount_cents < 0 then transaction_row.id else counterpart_id end,
      case when transaction_row.amount_cents > 0 then transaction_row.id else counterpart_id end,
      'own_transfer'
    );
    select id into override_id from public.transaction_semantic_overrides
    where transaction_id = transaction_row.id and owner_id = current_owner;
    return override_id;
  elsif p_effective_nature = 'card_payment' then
    if transaction_row.amount_cents >= 0 or p_statement_id is null
      or p_counterpart_transaction_id is not null or p_savings_box_id is not null then
      raise exception 'Card payment requires a negative transaction and a statement';
    end if;
    if not exists (
      select 1 from public.card_statements where id = p_statement_id and owner_id = current_owner
    ) then raise exception 'Statement not available'; end if;
    effective_reporting := 'neutral';
  else
    if p_savings_box_id is null or p_counterpart_transaction_id is not null or p_statement_id is not null then
      raise exception 'Savings movement requires only a savings box';
    end if;
    if p_effective_nature = 'savings_contribution' and transaction_row.amount_cents >= 0 then
      raise exception 'Savings contribution requires a negative transaction';
    end if;
    if p_effective_nature = 'savings_withdrawal' and transaction_row.amount_cents <= 0 then
      raise exception 'Savings withdrawal requires a positive transaction';
    end if;
    perform 1 from public.savings_boxes
    where id = p_savings_box_id and owner_id = current_owner and archived_at is null for update;
    if not found then raise exception 'Savings box not available'; end if;
    movement_type := case when p_effective_nature = 'savings_contribution' then 'contribution' else 'withdrawal' end;
    movement_amount := abs(transaction_row.amount_cents);
    select b.opening_balance_cents + coalesce((select sum(
      case when m.movement_type = 'contribution' then m.amount_cents else -m.amount_cents end
    ) from public.savings_movements m where m.savings_box_id = b.id), 0) into box_balance
    from public.savings_boxes b where b.id = p_savings_box_id;
    if movement_type = 'withdrawal' and movement_amount > box_balance then
      raise exception 'Savings box balance is insufficient';
    end if;
    effective_reporting := 'neutral';
  end if;

  insert into public.transaction_semantic_overrides (
    owner_id, transaction_id, effective_nature, effective_reporting, statement_id, savings_box_id
  ) values (
    current_owner, transaction_row.id, p_effective_nature, effective_reporting, p_statement_id, p_savings_box_id
  ) returning id into override_id;

  if p_effective_nature = 'card_payment' then
    insert into public.card_statement_entries (owner_id, statement_id, transaction_id, entry_type)
    values (current_owner, p_statement_id, transaction_row.id, 'payment');
  elsif p_effective_nature in ('savings_contribution', 'savings_withdrawal') then
    insert into public.savings_movements (
      owner_id, savings_box_id, transaction_id, movement_type, amount_cents, event_date
    ) values (
      current_owner, p_savings_box_id, transaction_row.id, movement_type, movement_amount, transaction_row.event_date
    );
  end if;

  return override_id;
end;
$$;

revoke all on function public.confirm_transaction_semantics(uuid, text, uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.confirm_transaction_semantics(uuid, text, uuid, uuid, uuid, uuid) to authenticated;

comment on table public.transaction_review_history is
  'Versoes substituidas de natureza e categoria; o lancamento importado e os aliases permanecem intactos.';
