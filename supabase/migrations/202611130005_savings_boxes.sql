create table public.savings_boxes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 80),
  opening_balance_cents bigint not null default 0 check (opening_balance_cents >= 0),
  target_cents bigint not null check (target_cents > 0),
  target_date date,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, owner_id),
  unique (owner_id, name)
);

create table public.savings_movements (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  savings_box_id uuid not null references public.savings_boxes(id),
  transaction_id uuid not null unique references public.transactions(id),
  movement_type text not null check (movement_type in ('contribution', 'withdrawal')),
  amount_cents bigint not null check (amount_cents > 0),
  event_date date not null,
  created_at timestamptz not null default now(),
  constraint savings_movements_box_owner foreign key (savings_box_id, owner_id) references public.savings_boxes(id, owner_id),
  constraint savings_movements_transaction_owner foreign key (transaction_id, owner_id) references public.transactions(id, owner_id)
);

create index savings_movements_box_date on public.savings_movements (savings_box_id, event_date desc);

alter table public.savings_boxes enable row level security;
alter table public.savings_movements enable row level security;

revoke all on table public.savings_boxes, public.savings_movements from anon, authenticated;
grant select on table public.savings_boxes, public.savings_movements to authenticated;

create policy "owner reads savings boxes" on public.savings_boxes for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "owner reads savings movements" on public.savings_movements for select to authenticated
  using (owner_id = (select auth.uid()));

create function public.create_savings_box(
  p_name text, p_opening_balance_cents bigint, p_target_cents bigint, p_target_date date default null
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  current_owner uuid := auth.uid();
  box_id uuid;
begin
  if current_owner is null then raise exception 'Authentication required'; end if;
  if char_length(trim(p_name)) not between 2 and 80 then raise exception 'Invalid savings box name'; end if;
  if p_opening_balance_cents < 0 or p_target_cents <= 0 then raise exception 'Invalid savings box values'; end if;

  insert into public.savings_boxes (owner_id, name, opening_balance_cents, target_cents, target_date)
  values (current_owner, trim(p_name), p_opening_balance_cents, p_target_cents, p_target_date)
  returning id into box_id;
  return box_id;
end;
$$;

create function public.create_savings_movement(
  p_savings_box_id uuid, p_account_id uuid, p_movement_type text, p_description text,
  p_amount_cents bigint, p_event_date date, p_competence text
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  current_owner uuid := auth.uid();
  box_balance bigint;
  transaction_id uuid;
  movement_id uuid;
begin
  if current_owner is null then raise exception 'Authentication required'; end if;
  if p_movement_type not in ('contribution', 'withdrawal') or p_amount_cents <= 0 then raise exception 'Invalid savings movement'; end if;
  if char_length(trim(p_description)) not between 3 and 120 then raise exception 'Invalid description'; end if;
  if p_competence !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' or p_competence <> to_char(p_event_date, 'YYYY-MM') then
    raise exception 'Invalid competence';
  end if;
  if not exists (
    select 1 from public.financial_accounts
    where id = p_account_id and owner_id = current_owner and archived_at is null and account_type <> 'credit_card'
  ) then raise exception 'Account not available'; end if;

  perform 1 from public.savings_boxes
  where id = p_savings_box_id and owner_id = current_owner and archived_at is null for update;
  if not found then raise exception 'Savings box not available'; end if;
  select b.opening_balance_cents + coalesce((select sum(
    case when m.movement_type = 'contribution' then m.amount_cents else -m.amount_cents end
  ) from public.savings_movements m where m.savings_box_id = b.id), 0) into box_balance
  from public.savings_boxes b where b.id = p_savings_box_id;
  if p_movement_type = 'withdrawal' and p_amount_cents > box_balance then raise exception 'Savings box balance is insufficient'; end if;

  insert into public.transactions (
    owner_id, account_id, category_id, description, amount_cents, nature, reporting,
    source, event_date, competence, classification_status
  ) values (
    current_owner, p_account_id, 'savings', trim(p_description),
    case when p_movement_type = 'contribution' then -p_amount_cents else p_amount_cents end,
    case when p_movement_type = 'contribution' then 'savings_contribution' else 'savings_withdrawal' end,
    'neutral', 'manual', p_event_date, p_competence, 'confirmed'
  ) returning id into transaction_id;

  insert into public.savings_movements (owner_id, savings_box_id, transaction_id, movement_type, amount_cents, event_date)
  values (current_owner, p_savings_box_id, transaction_id, p_movement_type, p_amount_cents, p_event_date)
  returning id into movement_id;
  return movement_id;
end;
$$;

create function public.link_savings_movement(
  p_savings_box_id uuid, p_transaction_id uuid, p_movement_type text
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  current_owner uuid := auth.uid();
  box_balance bigint;
  transaction_row public.transactions%rowtype;
  movement_amount bigint;
  movement_id uuid;
begin
  if current_owner is null then raise exception 'Authentication required'; end if;
  if p_movement_type not in ('contribution', 'withdrawal') then raise exception 'Invalid savings movement'; end if;

  select * into transaction_row from public.transactions
  where id = p_transaction_id and owner_id = current_owner and source = 'pluggy' and reporting = 'neutral'
    and nature in ('own_transfer', 'savings_contribution', 'savings_withdrawal');
  if transaction_row.id is null then raise exception 'Imported neutral transaction not available'; end if;
  if (p_movement_type = 'contribution' and transaction_row.amount_cents >= 0)
    or (p_movement_type = 'withdrawal' and transaction_row.amount_cents <= 0) then
    raise exception 'Transaction sign does not match movement type';
  end if;
  movement_amount := case when transaction_row.amount_cents < 0 then -transaction_row.amount_cents else transaction_row.amount_cents end;

  perform 1 from public.savings_boxes
  where id = p_savings_box_id and owner_id = current_owner and archived_at is null for update;
  if not found then raise exception 'Savings box not available'; end if;
  select b.opening_balance_cents + coalesce((select sum(
    case when m.movement_type = 'contribution' then m.amount_cents else -m.amount_cents end
  ) from public.savings_movements m where m.savings_box_id = b.id), 0) into box_balance
  from public.savings_boxes b where b.id = p_savings_box_id;
  if p_movement_type = 'withdrawal' and movement_amount > box_balance then raise exception 'Savings box balance is insufficient'; end if;

  insert into public.savings_movements (owner_id, savings_box_id, transaction_id, movement_type, amount_cents, event_date)
  values (current_owner, p_savings_box_id, p_transaction_id, p_movement_type, movement_amount, transaction_row.event_date)
  returning id into movement_id;
  return movement_id;
end;
$$;

revoke all on function public.create_savings_box(text, bigint, bigint, date) from public, anon;
revoke all on function public.create_savings_movement(uuid, uuid, text, text, bigint, date, text) from public, anon;
revoke all on function public.link_savings_movement(uuid, uuid, text) from public, anon;
grant execute on function public.create_savings_box(text, bigint, bigint, date) to authenticated;
grant execute on function public.create_savings_movement(uuid, uuid, text, text, bigint, date, text) to authenticated;
grant execute on function public.link_savings_movement(uuid, uuid, text) to authenticated;
