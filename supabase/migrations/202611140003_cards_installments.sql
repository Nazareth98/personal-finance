alter table public.credit_cards
  add column credit_limit_cents bigint check (credit_limit_cents is null or credit_limit_cents >= 0),
  add constraint credit_cards_id_owner_unique unique (id, owner_id);

revoke insert on table public.credit_cards from authenticated;

alter table public.transactions drop constraint transactions_nature_check;
alter table public.transactions add constraint transactions_nature_check check (
  nature in ('income', 'expense', 'refund', 'own_transfer', 'card_payment', 'savings_contribution', 'savings_withdrawal', 'adjustment')
);
alter table public.transactions drop constraint transactions_reporting_matches_nature;
alter table public.transactions add constraint transactions_reporting_matches_nature check (
  (nature = 'adjustment' and (
    (reporting = 'income' and amount_cents > 0)
    or (reporting = 'expense' and amount_cents < 0)
    or reporting = 'neutral'
  ))
  or (nature = 'income' and reporting = 'income' and amount_cents > 0)
  or (nature = 'expense' and reporting = 'expense' and amount_cents < 0)
  or (nature = 'refund' and reporting = 'expense' and amount_cents > 0)
  or (nature in ('own_transfer', 'card_payment', 'savings_contribution', 'savings_withdrawal') and reporting = 'neutral')
);

alter table private.pluggy_transactions
  add column installment_number smallint,
  add column total_installments smallint,
  add column installment_group_key text,
  add column original_transaction_id text,
  add column provider_bill_id text;

create or replace function public.internal_store_pluggy_transactions(p_rows jsonb) returns integer
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare inserted_count integer;
begin
  insert into private.pluggy_transactions (
    owner_id, connection_id, pluggy_account_id, external_transaction_id,
    description, amount_cents, event_date, provider_type, raw_category, merchant_name,
    installment_number, total_installments, installment_group_key, original_transaction_id, provider_bill_id
  )
  select
    (row->>'owner_id')::uuid, (row->>'connection_id')::uuid, (row->>'pluggy_account_id')::uuid,
    row->>'external_transaction_id', row->>'description', (row->>'amount_cents')::bigint,
    (row->>'event_date')::date, row->>'provider_type', row->>'raw_category', row->>'merchant_name',
    (row->>'installment_number')::smallint, (row->>'total_installments')::smallint,
    row->>'installment_group_key', row->>'original_transaction_id', row->>'provider_bill_id'
  from jsonb_array_elements(p_rows) row
  on conflict (owner_id, external_transaction_id) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create table public.card_statements (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  card_id uuid not null references public.credit_cards(id) on delete cascade,
  competence text not null check (competence ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  closing_date date not null,
  due_date date not null,
  provider_bill_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, card_id, competence),
  unique (id, owner_id),
  constraint card_statements_card_owner foreign key (card_id, owner_id) references public.credit_cards(id, owner_id),
  check (closing_date <= due_date)
);

create table public.card_statement_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  statement_id uuid not null references public.card_statements(id) on delete cascade,
  transaction_id uuid not null unique references public.transactions(id),
  entry_type text not null check (entry_type in ('purchase', 'refund', 'payment')),
  created_at timestamptz not null default now(),
  constraint card_statement_entries_statement_owner foreign key (statement_id, owner_id) references public.card_statements(id, owner_id),
  constraint card_statement_entries_transaction_owner foreign key (transaction_id, owner_id) references public.transactions(id, owner_id)
);

create table public.card_installments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  card_id uuid not null references public.credit_cards(id) on delete cascade,
  statement_id uuid not null references public.card_statements(id) on delete cascade,
  transaction_id uuid unique references public.transactions(id),
  purchase_group_key text not null,
  description text not null check (char_length(trim(description)) between 3 and 120),
  installment_number smallint not null check (installment_number between 1 and 120),
  total_installments smallint not null check (total_installments between installment_number and 120),
  amount_cents bigint not null check (amount_cents > 0),
  due_competence text not null check (due_competence ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  status text not null check (status in ('posted', 'projected', 'refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, purchase_group_key, installment_number),
  constraint card_installments_card_owner foreign key (card_id, owner_id) references public.credit_cards(id, owner_id),
  constraint card_installments_statement_owner foreign key (statement_id, owner_id) references public.card_statements(id, owner_id),
  constraint card_installments_transaction_owner foreign key (transaction_id, owner_id) references public.transactions(id, owner_id)
);

create index card_statements_owner_competence on public.card_statements (owner_id, competence desc);
create index card_statement_entries_statement on public.card_statement_entries (statement_id, entry_type);
create index card_installments_card_competence on public.card_installments (card_id, due_competence, installment_number);

alter table public.card_statements enable row level security;
alter table public.card_statement_entries enable row level security;
alter table public.card_installments enable row level security;

revoke all on table public.card_statements, public.card_statement_entries, public.card_installments from anon, authenticated;
grant select on table public.card_statements, public.card_statement_entries, public.card_installments to authenticated;

create policy "owner reads card statements" on public.card_statements for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "owner reads card statement entries" on public.card_statement_entries for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "owner reads card installments" on public.card_installments for select to authenticated
  using (owner_id = (select auth.uid()));

create function public.configure_credit_card(
  p_account_id uuid, p_closing_day smallint, p_due_day smallint, p_credit_limit_cents bigint default null
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  current_owner uuid := auth.uid();
  card_id uuid;
begin
  if current_owner is null then raise exception 'Authentication required'; end if;
  if p_closing_day not between 1 and 31 or p_due_day not between 1 and 31 then raise exception 'Invalid card calendar'; end if;
  if p_credit_limit_cents is not null and p_credit_limit_cents < 0 then raise exception 'Invalid credit limit'; end if;
  if not exists (
    select 1 from public.financial_accounts
    where id = p_account_id and owner_id = current_owner and account_type = 'credit_card' and archived_at is null
  ) then raise exception 'Credit card account not available'; end if;
  insert into public.credit_cards (owner_id, account_id, closing_day, due_day, credit_limit_cents)
  values (current_owner, p_account_id, p_closing_day, p_due_day, p_credit_limit_cents)
  on conflict (account_id) do update set
    closing_day = excluded.closing_day,
    due_day = excluded.due_day,
    credit_limit_cents = excluded.credit_limit_cents
  returning id into card_id;
  return card_id;
end;
$$;

create function public.link_card_payment(p_statement_id uuid, p_transaction_id uuid) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  current_owner uuid := auth.uid();
  entry_id uuid;
begin
  if current_owner is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.card_statements where id = p_statement_id and owner_id = current_owner) then
    raise exception 'Statement not available';
  end if;
  if not exists (
    select 1 from public.transactions where id = p_transaction_id and owner_id = current_owner
      and nature = 'card_payment' and reporting = 'neutral'
  ) then raise exception 'Card payment not available'; end if;
  insert into public.card_statement_entries (owner_id, statement_id, transaction_id, entry_type)
  values (current_owner, p_statement_id, p_transaction_id, 'payment')
  returning id into entry_id;
  return entry_id;
end;
$$;

revoke all on function public.configure_credit_card(uuid, smallint, smallint, bigint) from public, anon;
revoke all on function public.link_card_payment(uuid, uuid) from public, anon;
grant execute on function public.configure_credit_card(uuid, smallint, smallint, bigint) to authenticated;
grant execute on function public.link_card_payment(uuid, uuid) to authenticated;

comment on table public.card_installments is
  'Parcelas posted pertencem ao realizado; projected entram somente na previsão futura.';
