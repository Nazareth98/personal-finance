-- D-052: identidade da instituição por conta (logo/nome), para mostrar o banco real em contas, cartões e listas.
-- O vínculo conta ↔ conexão MeuPluggy fica em `private`; esta função expõe só o necessário e só ao dono.
create function public.get_account_institutions()
returns table (account_id uuid, connector_id integer, institution_name text)
language sql stable security definer set search_path = public, pg_temp as $$
  select pa.account_id, c.connector_id::integer, c.institution_name
  from private.pluggy_accounts pa
  join public.pluggy_connections c on c.id = pa.connection_id and c.owner_id = pa.owner_id
  where pa.owner_id = (select auth.uid());
$$;

revoke all on function public.get_account_institutions() from public, anon;
grant execute on function public.get_account_institutions() to authenticated;
