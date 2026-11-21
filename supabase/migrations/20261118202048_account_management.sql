-- Edição e arquivamento de contas (D-040). Nunca há exclusão física: a conta arquivada some das telas
-- e dos saldos, mas seus lançamentos continuam no livro e em receitas/despesas.

create function public.update_financial_account(p_account_id uuid, p_name text, p_opening_balance_cents bigint) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  current_owner uuid := auth.uid();
begin
  if current_owner is null then raise exception 'Authentication required'; end if;
  if char_length(trim(p_name)) not between 2 and 80 then raise exception 'Invalid account name'; end if;
  if p_opening_balance_cents is null then raise exception 'Invalid opening balance'; end if;
  update public.financial_accounts
  set name = trim(p_name), opening_balance_cents = p_opening_balance_cents
  where id = p_account_id and owner_id = current_owner and archived_at is null;
  if not found then raise exception 'Account not available'; end if;
end;
$$;

create function public.archive_financial_account(p_account_id uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  current_owner uuid := auth.uid();
begin
  if current_owner is null then raise exception 'Authentication required'; end if;
  update public.financial_accounts set archived_at = now()
  where id = p_account_id and owner_id = current_owner and archived_at is null;
  if not found then raise exception 'Account not available'; end if;
end;
$$;

revoke all on function public.update_financial_account(uuid, text, bigint) from public, anon;
revoke all on function public.archive_financial_account(uuid) from public, anon;
grant execute on function public.update_financial_account(uuid, text, bigint) to authenticated;
grant execute on function public.archive_financial_account(uuid) to authenticated;
