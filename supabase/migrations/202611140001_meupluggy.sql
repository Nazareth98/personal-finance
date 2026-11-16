create table public.pluggy_connections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  item_id text not null,
  connector_id integer,
  institution_name text not null default 'Instituição conectada'
    check (char_length(trim(institution_name)) between 2 and 100),
  status text not null default 'pending'
    check (status in ('pending', 'updating', 'ready', 'error', 'login_required')),
  last_source_updated_at timestamptz,
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  last_error text check (last_error is null or char_length(last_error) <= 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, item_id),
  unique (id, owner_id)
);

create table public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  connection_id uuid not null references public.pluggy_connections(id) on delete cascade,
  trigger_type text not null check (trigger_type in ('initial', 'manual', 'webhook', 'resume')),
  status text not null default 'pending' check (status in ('pending', 'running', 'succeeded', 'failed')),
  checkpoint jsonb not null default '{}'::jsonb,
  imported_accounts integer not null default 0 check (imported_accounts >= 0),
  imported_transactions integer not null default 0 check (imported_transactions >= 0),
  skipped_transactions integer not null default 0 check (skipped_transactions >= 0),
  error_code text,
  error_message text check (error_message is null or char_length(error_message) <= 240),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  constraint sync_runs_connection_owner foreign key (connection_id, owner_id)
    references public.pluggy_connections(id, owner_id)
);

create index pluggy_connections_owner_updated on public.pluggy_connections (owner_id, updated_at desc);
create index sync_runs_connection_created on public.sync_runs (connection_id, created_at desc);
create unique index sync_runs_one_active on public.sync_runs (owner_id)
  where status in ('pending', 'running');

create table private.pluggy_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  connection_id uuid not null references public.pluggy_connections(id) on delete cascade,
  external_account_id text not null,
  account_id uuid not null unique references public.financial_accounts(id) on delete cascade,
  provider_type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, external_account_id),
  constraint pluggy_accounts_connection_owner foreign key (connection_id, owner_id)
    references public.pluggy_connections(id, owner_id)
);

create table private.pluggy_transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  connection_id uuid not null references public.pluggy_connections(id) on delete cascade,
  pluggy_account_id uuid not null references private.pluggy_accounts(id) on delete cascade,
  external_transaction_id text not null,
  description text not null,
  amount_cents bigint not null check (amount_cents <> 0),
  event_date date not null,
  provider_type text,
  raw_category text,
  created_at timestamptz not null default now(),
  unique (owner_id, external_transaction_id),
  constraint pluggy_transactions_connection_owner foreign key (connection_id, owner_id)
    references public.pluggy_connections(id, owner_id)
);

create index pluggy_transactions_account_date
  on private.pluggy_transactions (pluggy_account_id, event_date desc);

create table private.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider_event_id text not null unique,
  event_type text not null,
  item_id text,
  payload jsonb not null,
  status text not null default 'received'
    check (status in ('received', 'processing', 'processed', 'failed', 'ignored')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text check (last_error is null or char_length(last_error) <= 240),
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.pluggy_connections enable row level security;
alter table public.sync_runs enable row level security;

revoke all on table public.pluggy_connections, public.sync_runs from anon, authenticated;
grant select on table public.pluggy_connections, public.sync_runs to authenticated;

create policy "owner reads pluggy connections" on public.pluggy_connections for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "owner reads sync runs" on public.sync_runs for select to authenticated
  using (owner_id = (select auth.uid()));

revoke all on table private.pluggy_accounts, private.pluggy_transactions, private.webhook_events
  from public, anon, authenticated;

create function public.internal_get_pluggy_account(p_owner_id uuid, p_external_account_id text)
returns table (mapping_id uuid, account_id uuid)
language sql security definer set search_path = public, private, pg_temp as $$
  select pa.id, pa.account_id
  from private.pluggy_accounts pa
  where pa.owner_id = p_owner_id and pa.external_account_id = p_external_account_id;
$$;

create function public.internal_create_pluggy_account(
  p_owner_id uuid, p_connection_id uuid, p_external_account_id text, p_account_id uuid, p_provider_type text
) returns uuid
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare mapping_id uuid;
begin
  insert into private.pluggy_accounts (owner_id, connection_id, external_account_id, account_id, provider_type)
  values (p_owner_id, p_connection_id, p_external_account_id, p_account_id, p_provider_type)
  returning id into mapping_id;
  return mapping_id;
end;
$$;

create function public.internal_store_pluggy_transactions(p_rows jsonb) returns integer
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare inserted_count integer;
begin
  insert into private.pluggy_transactions (
    owner_id, connection_id, pluggy_account_id, external_transaction_id,
    description, amount_cents, event_date, provider_type, raw_category
  )
  select
    (row->>'owner_id')::uuid, (row->>'connection_id')::uuid, (row->>'pluggy_account_id')::uuid,
    row->>'external_transaction_id', row->>'description', (row->>'amount_cents')::bigint,
    (row->>'event_date')::date, row->>'provider_type', row->>'raw_category'
  from jsonb_array_elements(p_rows) row
  on conflict (owner_id, external_transaction_id) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create function public.internal_register_webhook_event(
  p_provider_event_id text, p_event_type text, p_item_id text, p_payload jsonb
) returns text
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare event_status text;
begin
  insert into private.webhook_events (provider_event_id, event_type, item_id, payload)
  values (p_provider_event_id, p_event_type, p_item_id, p_payload)
  on conflict (provider_event_id) do nothing
  returning 'new' into event_status;
  if event_status is null then
    select status into event_status from private.webhook_events where provider_event_id = p_provider_event_id;
  end if;
  return event_status;
end;
$$;

create function public.internal_update_webhook_event(
  p_provider_event_id text, p_status text, p_last_error text default null
) returns void
language plpgsql security definer set search_path = public, private, pg_temp as $$
begin
  if p_status not in ('processing', 'processed', 'failed', 'ignored') then
    raise exception 'Invalid webhook status';
  end if;
  update private.webhook_events set
    status = p_status,
    attempt_count = attempt_count + case when p_status = 'processing' then 1 else 0 end,
    last_error = left(p_last_error, 240),
    processed_at = case when p_status in ('processed', 'failed', 'ignored') then now() else null end
  where provider_event_id = p_provider_event_id;
end;
$$;

revoke all on function public.internal_get_pluggy_account(uuid, text) from public, anon, authenticated;
revoke all on function public.internal_create_pluggy_account(uuid, uuid, text, uuid, text) from public, anon, authenticated;
revoke all on function public.internal_store_pluggy_transactions(jsonb) from public, anon, authenticated;
revoke all on function public.internal_register_webhook_event(text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.internal_update_webhook_event(text, text, text) from public, anon, authenticated;
grant execute on function public.internal_get_pluggy_account(uuid, text) to service_role;
grant execute on function public.internal_create_pluggy_account(uuid, uuid, text, uuid, text) to service_role;
grant execute on function public.internal_store_pluggy_transactions(jsonb) to service_role;
grant execute on function public.internal_register_webhook_event(text, text, text, jsonb) to service_role;
grant execute on function public.internal_update_webhook_event(text, text, text) to service_role;

comment on table private.pluggy_transactions is
  'Staging idempotente do MeuPluggy. Contas bancárias são materializadas no livro; cartões aguardam a competência da Etapa 7.';
comment on table private.webhook_events is
  'Caixa de entrada durável: o evento é persistido antes de qualquer sincronização.';
