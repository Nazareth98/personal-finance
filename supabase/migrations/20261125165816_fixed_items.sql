-- D-084 / etapa 12.1: fixos. Um fixo e o lancamento que se repete (aluguel, luz, salario), nao o valor.
-- Nasce do primeiro lancamento vinculado na Revisao; lancamentos iguais (mesma descricao normalizada,
-- mesmo efeito receita/despesa) chegam vinculados. Generico para qualquer instancia: so estruturas, sem dados.
-- Arquivo so em ASCII.

create table public.fixed_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 80),
  nature text not null check (nature in ('income', 'expense')),
  category_id text references public.categories(id),
  match_key text not null check (char_length(match_key) between 1 and 160),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id)
);
create unique index fixed_items_owner_active_name on public.fixed_items (owner_id, lower(name)) where ended_at is null;
create index fixed_items_owner_match on public.fixed_items (owner_id, match_key) where ended_at is null;

create table public.fixed_item_links (
  transaction_id uuid primary key references public.transactions(id) on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  fixed_item_id uuid not null,
  linked_by text not null check (linked_by in ('owner', 'auto_similar')),
  created_at timestamptz not null default now(),
  foreign key (fixed_item_id, owner_id) references public.fixed_items(id, owner_id) on delete cascade,
  foreign key (transaction_id, owner_id) references public.transactions(id, owner_id)
);
create index fixed_item_links_item on public.fixed_item_links (fixed_item_id);

alter table public.fixed_items enable row level security;
alter table public.fixed_item_links enable row level security;
revoke all on table public.fixed_items, public.fixed_item_links from anon, authenticated;
grant select on table public.fixed_items, public.fixed_item_links to authenticated;
create policy "owner reads fixed items" on public.fixed_items for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "owner reads fixed item links" on public.fixed_item_links for select to authenticated
  using (owner_id = (select auth.uid()));

-- Efeito receita/despesa de um lancamento, considerando a revisao do dono.
create function private.transaction_effect(p_transaction_id uuid) returns text
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(o.effective_reporting, t.reporting)
  from public.transactions t
  left join public.transaction_semantic_overrides o on o.transaction_id = t.id
  where t.id = p_transaction_id;
$$;
revoke all on function private.transaction_effect(uuid) from public, anon, authenticated;

-- Vincula ao fixo os lancamentos iguais ainda sem fixo (mesma chave e mesmo efeito). Devolve quantos.
create function private.link_similar_to_fixed_item(p_owner uuid, p_fixed_item_id uuid, p_linked_by text) returns integer
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare item public.fixed_items%rowtype; total integer;
begin
  select * into item from public.fixed_items where id = p_fixed_item_id and owner_id = p_owner and ended_at is null;
  if not found then return 0; end if;
  insert into public.fixed_item_links (transaction_id, owner_id, fixed_item_id, linked_by)
  select t.id, p_owner, item.id, p_linked_by
  from public.transactions t
  left join public.transaction_semantic_overrides o on o.transaction_id = t.id
  where t.owner_id = p_owner and t.source_deleted_at is null
    and coalesce(o.effective_reporting, t.reporting) = item.nature
    and private.normalize_classification_text(t.description) = item.match_key
    and not exists (select 1 from public.fixed_item_links l where l.transaction_id = t.id)
  on conflict (transaction_id) do nothing;
  get diagnostics total = row_count;
  return total;
end;
$$;
revoke all on function private.link_similar_to_fixed_item(uuid, uuid, text) from public, anon, authenticated;

-- Cria o fixo a partir de um lancamento de receita ou despesa e o vincula. Opcionalmente vincula os iguais.
create function public.create_fixed_item(p_transaction_id uuid, p_name text, p_category_id text, p_link_similar boolean)
returns jsonb
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare
  current_owner uuid := private.require_owner();
  tx public.transactions%rowtype;
  effect text;
  key text;
  new_id uuid;
  similar_count integer := 0;
begin
  select * into tx from public.transactions where id = p_transaction_id and owner_id = current_owner;
  if not found then raise exception 'Transaction not available'; end if;
  effect := private.transaction_effect(tx.id);
  if effect not in ('income', 'expense') then raise exception 'Only income or expense can be fixed'; end if;
  key := private.normalize_classification_text(tx.description);
  if key is null or key = '' then raise exception 'Description cannot produce a fixed item'; end if;

  insert into public.fixed_items (owner_id, name, nature, category_id, match_key)
  values (current_owner, trim(p_name), effect, nullif(p_category_id, ''), key)
  returning id into new_id;

  insert into public.fixed_item_links (transaction_id, owner_id, fixed_item_id, linked_by)
  values (tx.id, current_owner, new_id, 'owner')
  on conflict (transaction_id) do update set fixed_item_id = excluded.fixed_item_id, linked_by = 'owner', created_at = now();

  if p_link_similar then similar_count := private.link_similar_to_fixed_item(current_owner, new_id, 'owner'); end if;
  return jsonb_build_object('id', new_id, 'linkedSimilar', similar_count);
end;
$$;
revoke all on function public.create_fixed_item(uuid, text, text, boolean) from public, anon;
grant execute on function public.create_fixed_item(uuid, text, text, boolean) to authenticated;

-- Vincula (ou, com p_fixed_item_id nulo, desvincula) um lancamento. Com p_apply_similar, vale tambem para os
-- iguais: ao vincular, os iguais ainda sem fixo; ao desvincular, os iguais ligados ao mesmo fixo.
create function public.set_transaction_fixed_item(p_transaction_id uuid, p_fixed_item_id uuid, p_apply_similar boolean)
returns integer
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare
  current_owner uuid := private.require_owner();
  tx public.transactions%rowtype;
  item public.fixed_items%rowtype;
  previous uuid;
  total integer := 1;
begin
  select * into tx from public.transactions where id = p_transaction_id and owner_id = current_owner;
  if not found then raise exception 'Transaction not available'; end if;
  select fixed_item_id into previous from public.fixed_item_links where transaction_id = tx.id;

  if p_fixed_item_id is null then
    delete from public.fixed_item_links where transaction_id = tx.id;
    if p_apply_similar and previous is not null then
      delete from public.fixed_item_links l using public.transactions t
      where l.transaction_id = t.id and l.owner_id = current_owner and l.fixed_item_id = previous
        and private.normalize_classification_text(t.description) = private.normalize_classification_text(tx.description);
      get diagnostics total = row_count;
      total := total + 1;
    end if;
    return total;
  end if;

  select * into item from public.fixed_items where id = p_fixed_item_id and owner_id = current_owner and ended_at is null;
  if not found then raise exception 'Fixed item not available'; end if;
  if private.transaction_effect(tx.id) <> item.nature then raise exception 'Fixed item nature does not match'; end if;

  insert into public.fixed_item_links (transaction_id, owner_id, fixed_item_id, linked_by)
  values (tx.id, current_owner, item.id, 'owner')
  on conflict (transaction_id) do update set fixed_item_id = excluded.fixed_item_id, linked_by = 'owner', created_at = now();

  if p_apply_similar then
    insert into public.fixed_item_links (transaction_id, owner_id, fixed_item_id, linked_by)
    select t.id, current_owner, item.id, 'owner'
    from public.transactions t
    left join public.transaction_semantic_overrides o on o.transaction_id = t.id
    where t.owner_id = current_owner and t.source_deleted_at is null and t.id <> tx.id
      and coalesce(o.effective_reporting, t.reporting) = item.nature
      and private.normalize_classification_text(t.description) = private.normalize_classification_text(tx.description)
      and not exists (select 1 from public.fixed_item_links l where l.transaction_id = t.id)
    on conflict (transaction_id) do nothing;
    get diagnostics total = row_count;
    total := total + 1;
  end if;
  return total;
end;
$$;
revoke all on function public.set_transaction_fixed_item(uuid, uuid, boolean) from public, anon;
grant execute on function public.set_transaction_fixed_item(uuid, uuid, boolean) to authenticated;

-- Lancamentos que chegam do banco entram vinculados ao fixo de mesma chave e mesmo efeito.
create function private.link_fixed_items_after_insert() returns trigger
language plpgsql security definer set search_path = public, private, pg_temp as $$
begin
  if pg_trigger_depth() > 1 then return null; end if;
  insert into public.fixed_item_links (transaction_id, owner_id, fixed_item_id, linked_by)
  select r.id, r.owner_id, f.id, 'auto_similar'
  from inserted_rows r
  join public.fixed_items f on f.owner_id = r.owner_id and f.ended_at is null
    and f.match_key = private.normalize_classification_text(r.description)
    and f.nature = r.reporting
  where r.source_deleted_at is null
  on conflict (transaction_id) do nothing;
  return null;
end;
$$;
revoke all on function private.link_fixed_items_after_insert() from public, anon, authenticated;

create trigger transactions_link_fixed_items
  after insert on public.transactions
  referencing new table as inserted_rows
  for each statement execute function private.link_fixed_items_after_insert();
