alter table public.categories
  add column owner_id uuid references public.profiles(id) on delete cascade,
  add column category_type text not null default 'system' check (category_type in ('system', 'custom')),
  add column applicability text check (applicability in ('income', 'expense', 'neutral')),
  add column archived_at timestamptz,
  add column updated_at timestamptz not null default now();

update public.categories set applicability = case
  when id in ('salary', 'other_recurring_income', 'extraordinary_income') then 'income'
  when id in ('transfers', 'savings') then 'neutral'
  else 'expense'
end;

alter table public.categories
  alter column applicability set not null,
  add constraint categories_owner_matches_type check (
    (category_type = 'system' and owner_id is null)
    or (category_type = 'custom' and owner_id is not null)
  );

alter table public.categories drop constraint categories_name_key;
alter table public.categories drop constraint categories_sort_order_key;
create unique index categories_system_name on public.categories (lower(name)) where category_type = 'system';
create unique index categories_owner_name on public.categories (owner_id, lower(name)) where category_type = 'custom';
create index categories_owner_order on public.categories (owner_id, sort_order);

drop policy "authenticated reads categories" on public.categories;
create policy "owner reads available categories" on public.categories for select to authenticated
  using (category_type = 'system' or owner_id = (select auth.uid()));

create function private.require_owner() returns uuid
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare current_owner uuid := auth.uid();
begin
  if current_owner is null or not exists (
    select 1 from public.profiles where id = current_owner and is_owner
  ) then raise exception 'Owner authentication required'; end if;
  return current_owner;
end;
$$;

create function public.create_category(p_name text, p_applicability text) returns text
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare
  current_owner uuid := private.require_owner();
  new_id text := 'custom_' || replace(gen_random_uuid()::text, '-', '');
  next_order integer;
begin
  p_name := trim(p_name);
  if char_length(p_name) not between 2 and 60 then raise exception 'Category name must have between 2 and 60 characters'; end if;
  if p_applicability not in ('income', 'expense', 'neutral') then raise exception 'Invalid category applicability'; end if;
  if exists (select 1 from public.categories where lower(name) = lower(p_name) and (category_type = 'system' or owner_id = current_owner)) then
    raise exception 'Category name already exists';
  end if;
  select coalesce(max(sort_order), 0) + 10 into next_order
  from public.categories where category_type = 'system' or owner_id = current_owner;
  insert into public.categories (id, owner_id, name, sort_order, category_type, applicability)
  values (new_id, current_owner, p_name, next_order, 'custom', p_applicability);
  return new_id;
end;
$$;

create function public.rename_category(p_category_id text, p_name text) returns void
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare current_owner uuid := private.require_owner();
begin
  p_name := trim(p_name);
  if char_length(p_name) not between 2 and 60 then raise exception 'Category name must have between 2 and 60 characters'; end if;
  if exists (select 1 from public.categories where id <> p_category_id and lower(name) = lower(p_name) and (category_type = 'system' or owner_id = current_owner)) then
    raise exception 'Category name already exists';
  end if;
  update public.categories set name = p_name, updated_at = now()
  where id = p_category_id and owner_id = current_owner and category_type = 'custom';
  if not found then raise exception 'Custom category not available'; end if;
end;
$$;

create function public.move_category(p_category_id text, p_direction integer) returns void
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare
  current_owner uuid := private.require_owner();
  current_order integer;
  adjacent_id text;
  adjacent_order integer;
begin
  if p_direction not in (-1, 1) then raise exception 'Invalid category direction'; end if;
  select sort_order into current_order from public.categories
  where id = p_category_id and owner_id = current_owner and category_type = 'custom';
  if current_order is null then raise exception 'Custom category not available'; end if;
  select id, sort_order into adjacent_id, adjacent_order from public.categories
  where owner_id = current_owner and category_type = 'custom'
    and ((p_direction = -1 and sort_order < current_order) or (p_direction = 1 and sort_order > current_order))
  order by case when p_direction = -1 then -sort_order else sort_order end limit 1;
  if adjacent_id is null then return; end if;
  update public.categories set sort_order = case id when p_category_id then adjacent_order else current_order end, updated_at = now()
  where id in (p_category_id, adjacent_id);
end;
$$;

create function public.archive_category(p_category_id text, p_replacement_category_id text default null) returns void
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare
  current_owner uuid := private.require_owner();
  source_applicability text;
begin
  select applicability into source_applicability from public.categories
  where id = p_category_id and owner_id = current_owner and category_type = 'custom' and archived_at is null;
  if source_applicability is null then raise exception 'Custom category not available'; end if;
  if p_replacement_category_id is not null then
    if p_replacement_category_id = p_category_id or not exists (
      select 1 from public.categories where id = p_replacement_category_id
        and archived_at is null and applicability = source_applicability
        and (category_type = 'system' or owner_id = current_owner)
    ) then raise exception 'Replacement category is not compatible'; end if;

    update public.transactions set category_id = p_replacement_category_id
      where owner_id = current_owner and source = 'manual' and category_id = p_category_id;
    update public.transaction_classifications set category_id = p_replacement_category_id
      where owner_id = current_owner and category_id = p_category_id;
    update public.classification_rules set category_id = p_replacement_category_id, updated_at = now()
      where owner_id = current_owner and category_id = p_category_id;
    delete from public.category_budgets target using public.category_budgets replacement
      where target.owner_id = current_owner and target.category_id = p_category_id
        and replacement.owner_id = current_owner and replacement.category_id = p_replacement_category_id;
    update public.category_budgets set category_id = p_replacement_category_id, updated_at = now()
      where owner_id = current_owner and category_id = p_category_id;
  else
    update public.classification_rules set enabled = false, updated_at = now()
      where owner_id = current_owner and category_id = p_category_id;
  end if;
  update public.categories set archived_at = now(), updated_at = now() where id = p_category_id;
end;
$$;

create function private.validate_transaction_category() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare expected_applicability text;
begin
  if new.category_id is null or (tg_op = 'UPDATE' and new.category_id is not distinct from old.category_id) then return new; end if;
  expected_applicability := case new.reporting when 'income' then 'income' when 'expense' then 'expense' else 'neutral' end;
  if not exists (select 1 from public.categories where id = new.category_id and archived_at is null
    and applicability = expected_applicability and (category_type = 'system' or owner_id = new.owner_id)) then
    raise exception 'Category is not compatible with the transaction';
  end if;
  return new;
end;
$$;

create trigger transactions_validate_category
before insert or update of category_id on public.transactions
for each row execute function private.validate_transaction_category();

create function private.validate_classification_category() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare effective_applicability text;
begin
  if tg_op = 'UPDATE' and new.category_id is not distinct from old.category_id then return new; end if;
  select case coalesce(semantic.effective_reporting, transaction.reporting)
    when 'income' then 'income' when 'expense' then 'expense' else 'neutral' end
  into effective_applicability
  from public.transactions transaction
  left join public.transaction_semantic_overrides semantic on semantic.transaction_id = transaction.id
  where transaction.id = new.transaction_id and transaction.owner_id = new.owner_id;
  if not exists (select 1 from public.categories where id = new.category_id and archived_at is null
    and applicability = effective_applicability and (category_type = 'system' or owner_id = new.owner_id)) then
    raise exception 'Category is not compatible with the classification';
  end if;
  return new;
end;
$$;

create trigger transaction_classifications_validate_category
before insert or update of category_id on public.transaction_classifications
for each row execute function private.validate_classification_category();

create function public.delete_category(p_category_id text) returns void
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare current_owner uuid := private.require_owner();
begin
  if not exists (select 1 from public.categories where id = p_category_id and owner_id = current_owner and category_type = 'custom') then
    raise exception 'Custom category not available';
  end if;
  if exists (select 1 from public.transactions where owner_id = current_owner and category_id = p_category_id)
    or exists (select 1 from public.category_budgets where owner_id = current_owner and category_id = p_category_id)
    or exists (select 1 from public.classification_rules where owner_id = current_owner and category_id = p_category_id)
    or exists (select 1 from public.transaction_classifications where owner_id = current_owner and category_id = p_category_id)
    or exists (select 1 from public.classification_feedback where owner_id = current_owner and (previous_category_id = p_category_id or confirmed_category_id = p_category_id)) then
    raise exception 'Category has dependencies and cannot be deleted';
  end if;
  delete from public.categories where id = p_category_id;
end;
$$;

create function public.get_category_usage()
returns table (category_id text, dependency_count bigint)
language sql stable security definer set search_path = public, private, pg_temp as $$
  with owner as (select private.require_owner() id)
  select c.id,
    (select count(*) from public.transactions t, owner o where t.owner_id = o.id and t.category_id = c.id)
    + (select count(*) from public.category_budgets b, owner o where b.owner_id = o.id and b.category_id = c.id)
    + (select count(*) from public.classification_rules r, owner o where r.owner_id = o.id and r.category_id = c.id)
    + (select count(*) from public.transaction_classifications tc, owner o where tc.owner_id = o.id and tc.category_id = c.id)
    + (select count(*) from public.classification_feedback f, owner o where f.owner_id = o.id and (f.previous_category_id = c.id or f.confirmed_category_id = c.id))
  from public.categories c, owner o where c.category_type = 'system' or c.owner_id = o.id;
$$;

revoke all on function private.require_owner() from public, anon, authenticated;
revoke all on function private.validate_transaction_category() from public, anon, authenticated;
revoke all on function private.validate_classification_category() from public, anon, authenticated;
revoke all on function public.create_category(text, text) from public, anon;
revoke all on function public.rename_category(text, text) from public, anon;
revoke all on function public.move_category(text, integer) from public, anon;
revoke all on function public.archive_category(text, text) from public, anon;
revoke all on function public.delete_category(text) from public, anon;
revoke all on function public.get_category_usage() from public, anon;
grant execute on function public.create_category(text, text) to authenticated;
grant execute on function public.rename_category(text, text) to authenticated;
grant execute on function public.move_category(text, integer) to authenticated;
grant execute on function public.archive_category(text, text) to authenticated;
grant execute on function public.delete_category(text) to authenticated;
grant execute on function public.get_category_usage() to authenticated;

create or replace function public.set_category_budget(p_category_id text, p_percentage_basis_points integer) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare current_owner uuid := auth.uid(); budget_id uuid;
begin
  if current_owner is null then raise exception 'Authentication required'; end if;
  if p_percentage_basis_points not between 1 and 10000 then raise exception 'Percentage must be between 1 and 10000 basis points'; end if;
  if not exists (select 1 from public.categories where id = p_category_id and applicability = 'expense' and archived_at is null and (category_type = 'system' or owner_id = current_owner)) then
    raise exception 'Category is not available for an expense budget';
  end if;
  insert into public.category_budgets (owner_id, category_id, percentage_basis_points)
  values (current_owner, p_category_id, p_percentage_basis_points)
  on conflict (owner_id, category_id) do update set percentage_basis_points = excluded.percentage_basis_points, updated_at = now()
  returning id into budget_id;
  return budget_id;
end;
$$;
