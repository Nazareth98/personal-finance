create table public.transaction_semantic_overrides (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  transaction_id uuid not null unique references public.transactions(id) on delete cascade,
  effective_nature text not null check (effective_nature in (
    'income', 'expense', 'own_transfer', 'card_payment', 'savings_contribution', 'savings_withdrawal'
  )),
  effective_reporting text not null check (effective_reporting in ('income', 'expense', 'neutral')),
  counterpart_transaction_id uuid references public.transactions(id),
  statement_id uuid references public.card_statements(id),
  savings_box_id uuid references public.savings_boxes(id),
  reason text not null default 'owner_confirmation' check (reason = 'owner_confirmation'),
  semantic_version text not null default 'semantics-v1' check (semantic_version = 'semantics-v1'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint semantic_overrides_transaction_owner
    foreign key (transaction_id, owner_id) references public.transactions(id, owner_id),
  constraint semantic_overrides_counterpart_owner
    foreign key (counterpart_transaction_id, owner_id) references public.transactions(id, owner_id),
  constraint semantic_overrides_statement_owner
    foreign key (statement_id, owner_id) references public.card_statements(id, owner_id),
  constraint semantic_overrides_savings_box_owner
    foreign key (savings_box_id, owner_id) references public.savings_boxes(id, owner_id),
  constraint semantic_overrides_reporting_matches_nature check (
    (effective_nature = 'income' and effective_reporting = 'income')
    or (effective_nature = 'expense' and effective_reporting = 'expense')
    or (effective_nature in ('own_transfer', 'card_payment', 'savings_contribution', 'savings_withdrawal')
      and effective_reporting = 'neutral')
  ),
  constraint semantic_overrides_required_link check (
    (effective_nature = 'own_transfer' and counterpart_transaction_id is not null
      and statement_id is null and savings_box_id is null)
    or (effective_nature = 'card_payment' and counterpart_transaction_id is null
      and statement_id is not null and savings_box_id is null)
    or (effective_nature in ('savings_contribution', 'savings_withdrawal')
      and counterpart_transaction_id is null and statement_id is null and savings_box_id is not null)
    or (effective_nature in ('income', 'expense')
      and counterpart_transaction_id is null and statement_id is null and savings_box_id is null)
  )
);

create index transaction_semantic_overrides_owner_updated
  on public.transaction_semantic_overrides (owner_id, updated_at desc);

alter table public.transaction_semantic_overrides enable row level security;

revoke all on table public.transaction_semantic_overrides from anon, authenticated;
grant select on table public.transaction_semantic_overrides to authenticated;

create policy "owner reads semantic overrides" on public.transaction_semantic_overrides
  for select to authenticated using (owner_id = (select auth.uid()));

create function public.confirm_transaction_semantics(
  p_transaction_id uuid,
  p_effective_nature text,
  p_counterpart_transaction_id uuid default null,
  p_statement_id uuid default null,
  p_savings_box_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  current_owner uuid := auth.uid();
  transaction_row public.transactions%rowtype;
  counterpart_row public.transactions%rowtype;
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
    if p_counterpart_transaction_id is null or p_statement_id is not null or p_savings_box_id is not null then
      raise exception 'Own transfer requires only a counterpart transaction';
    end if;
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

    insert into public.transaction_semantic_overrides (
      owner_id, transaction_id, effective_nature, effective_reporting, counterpart_transaction_id
    ) values
      (current_owner, transaction_row.id, 'own_transfer', 'neutral', counterpart_row.id),
      (current_owner, counterpart_row.id, 'own_transfer', 'neutral', transaction_row.id);
    insert into public.transaction_links (owner_id, source_transaction_id, target_transaction_id, link_type)
    values (
      current_owner,
      case when transaction_row.amount_cents < 0 then transaction_row.id else counterpart_row.id end,
      case when transaction_row.amount_cents > 0 then transaction_row.id else counterpart_row.id end,
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

revoke all on function public.confirm_transaction_semantics(uuid, text, uuid, uuid, uuid) from public, anon;
grant execute on function public.confirm_transaction_semantics(uuid, text, uuid, uuid, uuid) to authenticated;

comment on table public.transaction_semantic_overrides is
  'Overlay auditavel da natureza efetiva; o lancamento importado permanece imutavel.';
