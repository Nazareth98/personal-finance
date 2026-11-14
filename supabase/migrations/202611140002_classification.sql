alter table private.pluggy_transactions add column merchant_name text;

create or replace function public.internal_store_pluggy_transactions(p_rows jsonb) returns integer
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare inserted_count integer;
begin
  insert into private.pluggy_transactions (
    owner_id, connection_id, pluggy_account_id, external_transaction_id,
    description, amount_cents, event_date, provider_type, raw_category, merchant_name
  )
  select
    (row->>'owner_id')::uuid, (row->>'connection_id')::uuid, (row->>'pluggy_account_id')::uuid,
    row->>'external_transaction_id', row->>'description', (row->>'amount_cents')::bigint,
    (row->>'event_date')::date, row->>'provider_type', row->>'raw_category', row->>'merchant_name'
  from jsonb_array_elements(p_rows) row
  on conflict (owner_id, external_transaction_id) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create table public.classification_rules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  category_id text not null references public.categories(id),
  evidence_type text not null check (evidence_type in ('merchant', 'alias', 'token', 'account', 'nature')),
  pattern text not null check (char_length(trim(pattern)) between 1 and 160),
  weight_basis_points integer not null check (weight_basis_points between 1 and 10000),
  source text not null check (source in ('feedback', 'manual', 'system')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, evidence_type, pattern),
  unique (id, owner_id)
);

create table public.transaction_classifications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  transaction_id uuid not null unique references public.transactions(id) on delete cascade,
  category_id text not null references public.categories(id),
  confidence_basis_points integer not null check (confidence_basis_points between 7000 and 10000),
  status text not null check (status in ('automatic', 'suggested', 'confirmed')),
  classifier_version text not null check (char_length(classifier_version) between 1 and 40),
  explanation jsonb not null check (jsonb_typeof(explanation) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id),
  constraint transaction_classifications_owner foreign key (transaction_id, owner_id)
    references public.transactions(id, owner_id)
);

create table public.classification_feedback (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id),
  previous_category_id text references public.categories(id),
  confirmed_category_id text not null references public.categories(id),
  normalized_description text not null check (char_length(normalized_description) between 1 and 160),
  created_at timestamptz not null default now(),
  constraint classification_feedback_transaction_owner foreign key (transaction_id, owner_id)
    references public.transactions(id, owner_id)
);

create index classification_rules_owner_enabled on public.classification_rules (owner_id, enabled, evidence_type);
create index transaction_classifications_owner_status on public.transaction_classifications (owner_id, status, updated_at desc);
create index classification_feedback_owner_created on public.classification_feedback (owner_id, created_at desc);

alter table public.classification_rules enable row level security;
alter table public.transaction_classifications enable row level security;
alter table public.classification_feedback enable row level security;

revoke all on table public.classification_rules, public.transaction_classifications, public.classification_feedback
  from anon, authenticated;
grant select on table public.classification_rules, public.transaction_classifications, public.classification_feedback
  to authenticated;

create policy "owner reads classification rules" on public.classification_rules for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "owner reads transaction classifications" on public.transaction_classifications for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "owner reads classification feedback" on public.classification_feedback for select to authenticated
  using (owner_id = (select auth.uid()));

create function private.normalize_classification_text(value text) returns text
language sql immutable strict set search_path = pg_catalog, pg_temp as $$
  select trim(regexp_replace(
    regexp_replace(
      regexp_replace(
        translate(lower(value), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
        '\m[0-9]{3,}\M', ' ', 'g'
      ),
      '[^a-z0-9]+', ' ', 'g'
    ),
    '\s+', ' ', 'g'
  ));
$$;

create function public.confirm_transaction_classification(p_transaction_id uuid, p_category_id text) returns void
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare
  current_owner uuid := auth.uid();
  transaction_row public.transactions%rowtype;
  previous_category text;
  normalized text;
  learned_rule_id uuid;
begin
  if current_owner is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.categories where id = p_category_id) then raise exception 'Category not available'; end if;
  select * into transaction_row from public.transactions
  where id = p_transaction_id and owner_id = current_owner and source = 'pluggy' and nature in ('income', 'expense');
  if transaction_row.id is null then raise exception 'Imported transaction not available'; end if;

  normalized := private.normalize_classification_text(transaction_row.description);
  if normalized = '' then raise exception 'Description cannot produce an alias'; end if;
  select coalesce(tc.category_id, transaction_row.category_id) into previous_category
  from (select 1) seed
  left join public.transaction_classifications tc on tc.transaction_id = transaction_row.id;

  insert into public.classification_feedback (
    owner_id, transaction_id, previous_category_id, confirmed_category_id, normalized_description
  ) values (current_owner, transaction_row.id, previous_category, p_category_id, normalized);

  insert into public.classification_rules (
    owner_id, category_id, evidence_type, pattern, weight_basis_points, source
  ) values (current_owner, p_category_id, 'alias', normalized, 9000, 'feedback')
  on conflict (owner_id, evidence_type, pattern) do update set
    category_id = excluded.category_id,
    weight_basis_points = excluded.weight_basis_points,
    source = 'feedback',
    enabled = true,
    updated_at = now()
  returning id into learned_rule_id;

  insert into public.transaction_classifications (
    owner_id, transaction_id, category_id, confidence_basis_points, status, classifier_version, explanation
  ) values (
    current_owner, transaction_row.id, p_category_id, 10000, 'confirmed', 'rules-v1',
    jsonb_build_object('evidence', jsonb_build_array(jsonb_build_object(
      'ruleId', learned_rule_id, 'kind', 'alias', 'value', normalized,
      'weightBasisPoints', 10000, 'label', 'Correção confirmada'
    )))
  )
  on conflict (transaction_id) do update set
    category_id = excluded.category_id,
    confidence_basis_points = 10000,
    status = 'confirmed',
    classifier_version = excluded.classifier_version,
    explanation = excluded.explanation,
    updated_at = now();

  insert into public.transaction_classifications (
    owner_id, transaction_id, category_id, confidence_basis_points, status, classifier_version, explanation
  )
  select
    current_owner, candidate.id, p_category_id, 9000, 'automatic', 'rules-v1',
    jsonb_build_object('evidence', jsonb_build_array(jsonb_build_object(
      'ruleId', learned_rule_id, 'kind', 'alias', 'value', normalized,
      'weightBasisPoints', 9000, 'label', 'Alias aprendido de correção confirmada'
    )))
  from public.transactions candidate
  where candidate.owner_id = current_owner
    and candidate.source = 'pluggy'
    and candidate.nature in ('income', 'expense')
    and candidate.id <> transaction_row.id
    and private.normalize_classification_text(candidate.description) = normalized
  on conflict (transaction_id) do update set
    category_id = excluded.category_id,
    confidence_basis_points = excluded.confidence_basis_points,
    status = excluded.status,
    classifier_version = excluded.classifier_version,
    explanation = excluded.explanation,
    updated_at = now()
  where public.transaction_classifications.status <> 'confirmed';
end;
$$;

revoke all on function private.normalize_classification_text(text) from public, anon, authenticated;
revoke all on function public.confirm_transaction_classification(uuid, text) from public, anon;
grant execute on function public.confirm_transaction_classification(uuid, text) to authenticated;

comment on table public.transaction_classifications is
  'Overlay versionado: classifica sem alterar o lançamento MeuPluggy imutável.';
