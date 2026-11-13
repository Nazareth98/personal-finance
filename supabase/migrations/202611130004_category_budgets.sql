create table public.category_budgets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  category_id text not null references public.categories(id),
  percentage_basis_points smallint not null check (percentage_basis_points between 1 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, category_id)
);

alter table public.category_budgets enable row level security;

revoke all on table public.category_budgets from anon, authenticated;
grant select on table public.category_budgets to authenticated;

create policy "owner reads category budgets" on public.category_budgets for select to authenticated
  using (owner_id = (select auth.uid()));

create function public.set_category_budget(p_category_id text, p_percentage_basis_points integer) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  current_owner uuid := auth.uid();
  budget_id uuid;
begin
  if current_owner is null then raise exception 'Authentication required'; end if;
  if p_percentage_basis_points not between 1 and 10000 then raise exception 'Percentage must be between 1 and 10000 basis points'; end if;
  if p_category_id in ('salary', 'other_recurring_income', 'extraordinary_income', 'transfers', 'savings')
    or not exists (select 1 from public.categories where id = p_category_id) then
    raise exception 'Category is not available for an expense budget';
  end if;

  insert into public.category_budgets (owner_id, category_id, percentage_basis_points)
  values (current_owner, p_category_id, p_percentage_basis_points)
  on conflict (owner_id, category_id) do update
    set percentage_basis_points = excluded.percentage_basis_points, updated_at = now()
  returning id into budget_id;

  return budget_id;
end;
$$;

revoke all on function public.set_category_budget(text, integer) from public, anon;
grant execute on function public.set_category_budget(text, integer) to authenticated;
