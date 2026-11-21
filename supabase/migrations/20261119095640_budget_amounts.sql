-- D-046: metas passam a ser um teto mensal em centavos, não um percentual da receita.
-- Decisão do proprietário: as metas em percentual são apagadas e recadastradas em R$.
delete from public.category_budgets;

alter table public.category_budgets drop column percentage_basis_points;
alter table public.category_budgets
  add column monthly_limit_cents bigint not null check (monthly_limit_cents > 0 and monthly_limit_cents <= 100000000000);

drop function public.set_category_budget(text, integer);

create function public.set_category_budget(p_category_id text, p_monthly_limit_cents bigint) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare current_owner uuid := auth.uid(); budget_id uuid;
begin
  if current_owner is null then raise exception 'Authentication required'; end if;
  if p_monthly_limit_cents is null or p_monthly_limit_cents <= 0 or p_monthly_limit_cents > 100000000000 then
    raise exception 'Monthly limit must be between 1 and 100000000000 cents';
  end if;
  if not exists (select 1 from public.categories where id = p_category_id and applicability = 'expense' and archived_at is null and (category_type = 'system' or owner_id = current_owner)) then
    raise exception 'Category is not available for an expense budget';
  end if;
  insert into public.category_budgets (owner_id, category_id, monthly_limit_cents)
  values (current_owner, p_category_id, p_monthly_limit_cents)
  on conflict (owner_id, category_id) do update set monthly_limit_cents = excluded.monthly_limit_cents, updated_at = now()
  returning id into budget_id;
  return budget_id;
end;
$$;

revoke all on function public.set_category_budget(text, bigint) from public, anon;
grant execute on function public.set_category_budget(text, bigint) to authenticated;

comment on column public.category_budgets.monthly_limit_cents is 'Teto mensal da categoria em centavos (D-046). Período anual = 12 × teto.';
