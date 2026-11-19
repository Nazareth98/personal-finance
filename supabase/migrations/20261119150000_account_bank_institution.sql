-- D-056: banco de cada conta vinda do MeuPluggy. A conexão é do agregador (conector 200), então a logo e o nome
-- eram os do MeuPluggy em todas as contas. A sincronização casa o nome da conta com o catálogo de bancos da Pluggy
-- e grava aqui o conector do banco; sem isso, vale o conector da conexão (contas de conexão direta).

alter table private.pluggy_accounts
  add column institution_connector_id integer check (institution_connector_id is null or institution_connector_id > 0),
  add column institution_name text check (institution_name is null or char_length(institution_name) between 1 and 100);

create function public.internal_set_pluggy_account_institution(p_mapping_id uuid, p_connector_id integer, p_institution_name text)
returns void
language sql security definer set search_path = public, pg_temp as $$
  update private.pluggy_accounts
  set institution_connector_id = p_connector_id, institution_name = left(p_institution_name, 100), updated_at = now()
  where id = p_mapping_id
    and (institution_connector_id is distinct from p_connector_id or institution_name is distinct from left(p_institution_name, 100));
$$;

revoke all on function public.internal_set_pluggy_account_institution(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.internal_set_pluggy_account_institution(uuid, integer, text) to service_role;

create or replace function public.get_account_institutions()
returns table (account_id uuid, connector_id integer, institution_name text)
language sql stable security definer set search_path = public, pg_temp as $$
  select pa.account_id, coalesce(pa.institution_connector_id, c.connector_id::integer), coalesce(pa.institution_name, c.institution_name)
  from private.pluggy_accounts pa
  join public.pluggy_connections c on c.id = pa.connection_id and c.owner_id = pa.owner_id
  where pa.owner_id = (select auth.uid());
$$;

revoke all on function public.get_account_institutions() from public, anon;
grant execute on function public.get_account_institutions() to authenticated;
