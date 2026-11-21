-- Remove a meta de uma categoria do proprietário. Metas não guardam histórico:
-- o teto é recalculado a cada período sobre a receita confirmada.
create function public.delete_category_budget(p_category_id text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  current_owner uuid := auth.uid();
begin
  if current_owner is null then raise exception 'Authentication required'; end if;
  delete from public.category_budgets where owner_id = current_owner and category_id = p_category_id;
  if not found then raise exception 'Budget not found'; end if;
end;
$$;

revoke all on function public.delete_category_budget(text) from public, anon;
grant execute on function public.delete_category_budget(text) to authenticated;
