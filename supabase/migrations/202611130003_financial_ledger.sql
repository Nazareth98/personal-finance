create table public.financial_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 80),
  account_type text not null check (account_type in ('checking', 'savings', 'investment', 'credit_card')),
  opening_balance_cents bigint not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);

create table public.categories (
  id text primary key,
  name text not null unique,
  sort_order smallint not null unique
);

insert into public.categories (id, name, sort_order) values
  ('housing', 'Moradia', 10), ('home_bills', 'Contas domésticas', 20),
  ('groceries', 'Supermercado', 30), ('delivery', 'Delivery/iFood', 40),
  ('restaurants', 'Restaurantes', 50), ('ride_hailing', 'Transporte por aplicativo', 60),
  ('public_transport', 'Transporte público', 70), ('fuel', 'Combustível', 80),
  ('health', 'Saúde', 90), ('personal_care', 'Cuidados pessoais', 100),
  ('leisure', 'Lazer', 110), ('subscriptions', 'Assinaturas', 120),
  ('education', 'Educação', 130), ('travel', 'Viagens', 140),
  ('taxes', 'Tributos', 150), ('fees_interest', 'Tarifas e juros', 160),
  ('gifts', 'Presentes', 170), ('salary', 'Salário', 180),
  ('other_recurring_income', 'Outras receitas recorrentes', 190),
  ('extraordinary_income', 'Receitas extraordinárias', 200),
  ('transfers', 'Transferências', 210), ('savings', 'Aportes/resgates', 220),
  ('other_expenses', 'Outros gastos', 230);

create table public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  account_id uuid not null unique references public.financial_accounts(id) on delete cascade,
  closing_day smallint check (closing_day between 1 and 31),
  due_day smallint check (due_day between 1 and 31),
  created_at timestamptz not null default now(),
  constraint credit_cards_account_owner foreign key (account_id, owner_id) references public.financial_accounts(id, owner_id)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  account_id uuid not null references public.financial_accounts(id),
  category_id text references public.categories(id),
  description text not null check (char_length(trim(description)) between 3 and 120),
  amount_cents bigint not null check (amount_cents <> 0),
  nature text not null check (nature in ('income', 'expense', 'own_transfer', 'card_payment', 'savings_contribution', 'savings_withdrawal', 'adjustment')),
  reporting text not null check (reporting in ('income', 'expense', 'neutral')),
  source text not null check (source in ('manual', 'pluggy')),
  event_date date not null,
  competence text not null check (competence ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  classification_status text not null check (classification_status in ('automatic', 'suggested', 'uncategorized', 'confirmed')),
  external_key text,
  created_at timestamptz not null default now(),
  constraint transactions_reporting_matches_nature check (
    (nature = 'adjustment' and (
      (reporting = 'income' and amount_cents > 0)
      or (reporting = 'expense' and amount_cents < 0)
      or reporting = 'neutral'
    ))
    or (nature = 'income' and reporting = 'income' and amount_cents > 0)
    or (nature = 'expense' and reporting = 'expense' and amount_cents < 0)
    or (nature in ('own_transfer', 'card_payment', 'savings_contribution', 'savings_withdrawal') and reporting = 'neutral')
  ),
  constraint transactions_external_key_source check (
    (source = 'pluggy' and external_key is not null) or (source = 'manual' and external_key is null)
  ),
  constraint transactions_account_owner foreign key (account_id, owner_id) references public.financial_accounts(id, owner_id),
  unique (id, owner_id)
);

create unique index transactions_external_key on public.transactions (owner_id, external_key) where external_key is not null;
create index transactions_owner_competence on public.transactions (owner_id, competence, event_date desc);
create index transactions_account on public.transactions (account_id, event_date desc);

create table public.transaction_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  source_transaction_id uuid not null references public.transactions(id),
  target_transaction_id uuid not null references public.transactions(id),
  link_type text not null check (link_type in ('own_transfer', 'adjustment', 'refund', 'card_payment')),
  created_at timestamptz not null default now(),
  check (source_transaction_id <> target_transaction_id),
  unique (source_transaction_id, target_transaction_id, link_type),
  constraint transaction_links_source_owner foreign key (source_transaction_id, owner_id) references public.transactions(id, owner_id),
  constraint transaction_links_target_owner foreign key (target_transaction_id, owner_id) references public.transactions(id, owner_id)
);

alter table public.financial_accounts enable row level security;
alter table public.categories enable row level security;
alter table public.credit_cards enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_links enable row level security;

revoke all on table public.financial_accounts, public.categories, public.credit_cards, public.transactions, public.transaction_links from anon, authenticated;
grant select, insert on table public.financial_accounts, public.credit_cards to authenticated;
grant select on table public.transactions, public.transaction_links to authenticated;
grant select on table public.categories to authenticated;

create policy "owner manages accounts" on public.financial_accounts for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "authenticated reads categories" on public.categories for select to authenticated using (true);
create policy "owner manages cards" on public.credit_cards for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "owner manages transactions" on public.transactions for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "owner manages transaction links" on public.transaction_links for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create function private.prevent_imported_transaction_mutation() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if old.source = 'pluggy' then
    raise exception 'Imported transactions are immutable';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger transactions_keep_imported_immutable
before update or delete on public.transactions
for each row execute function private.prevent_imported_transaction_mutation();

revoke all on function private.prevent_imported_transaction_mutation() from public, anon, authenticated;

create function public.create_manual_transaction(
  account_id uuid, description text, amount_cents bigint, nature text, reporting text,
  event_date date, competence text, category_id text default null, adjusted_transaction_id uuid default null
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  new_id uuid;
  current_owner uuid := auth.uid();
begin
  if current_owner is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.financial_accounts a where a.id = account_id and a.owner_id = current_owner and a.archived_at is null) then
    raise exception 'Account not available';
  end if;
  if nature not in ('income', 'expense', 'adjustment') then raise exception 'Invalid manual nature'; end if;
  if amount_cents = 0 then raise exception 'Amount cannot be zero'; end if;
  if (reporting = 'income' and amount_cents < 0) or (reporting = 'expense' and amount_cents > 0) or reporting not in ('income', 'expense', 'neutral') then
    raise exception 'Amount and reporting mismatch';
  end if;
  if nature <> 'adjustment' and adjusted_transaction_id is not null then raise exception 'Only adjustments can link an original transaction'; end if;
  if adjusted_transaction_id is not null and not exists (select 1 from public.transactions t where t.id = adjusted_transaction_id and t.owner_id = current_owner) then
    raise exception 'Original transaction not available';
  end if;

  insert into public.transactions (owner_id, account_id, category_id, description, amount_cents, nature, reporting, source, event_date, competence, classification_status)
  values (current_owner, account_id, category_id, trim(description), amount_cents, nature, reporting, 'manual', event_date, competence, 'confirmed')
  returning id into new_id;

  if adjusted_transaction_id is not null then
    insert into public.transaction_links (owner_id, source_transaction_id, target_transaction_id, link_type)
    values (current_owner, new_id, adjusted_transaction_id, 'adjustment');
  end if;
  return new_id;
end;
$$;

create function public.create_manual_transfer(
  source_account_id uuid, target_account_id uuid, description text, amount_cents bigint, event_date date, competence text
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  current_owner uuid := auth.uid();
  debit_id uuid;
  credit_id uuid;
begin
  if current_owner is null then raise exception 'Authentication required'; end if;
  if source_account_id = target_account_id then raise exception 'Transfer accounts must differ'; end if;
  if amount_cents <= 0 then raise exception 'Transfer amount must be positive'; end if;
  if (select count(*) from public.financial_accounts a where a.id in (source_account_id, target_account_id) and a.owner_id = current_owner and a.archived_at is null) <> 2 then
    raise exception 'Transfer accounts not available';
  end if;

  insert into public.transactions (owner_id, account_id, category_id, description, amount_cents, nature, reporting, source, event_date, competence, classification_status)
  values (current_owner, source_account_id, 'transfers', trim(description), -amount_cents, 'own_transfer', 'neutral', 'manual', event_date, competence, 'confirmed')
  returning id into debit_id;
  insert into public.transactions (owner_id, account_id, category_id, description, amount_cents, nature, reporting, source, event_date, competence, classification_status)
  values (current_owner, target_account_id, 'transfers', trim(description), amount_cents, 'own_transfer', 'neutral', 'manual', event_date, competence, 'confirmed')
  returning id into credit_id;
  insert into public.transaction_links (owner_id, source_transaction_id, target_transaction_id, link_type)
  values (current_owner, debit_id, credit_id, 'own_transfer');
  return debit_id;
end;
$$;

revoke all on function public.create_manual_transaction(uuid, text, bigint, text, text, date, text, text, uuid) from public, anon;
revoke all on function public.create_manual_transfer(uuid, uuid, text, bigint, date, text) from public, anon;
grant execute on function public.create_manual_transaction(uuid, text, bigint, text, text, date, text, text, uuid) to authenticated;
grant execute on function public.create_manual_transfer(uuid, uuid, text, bigint, date, text) to authenticated;
