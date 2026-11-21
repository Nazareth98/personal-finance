-- D-064: chaves do Pluggy informadas no próprio app (instância de cada pessoa). O Client Secret fica no
-- Supabase Vault (criptografado); a tabela privada guarda só o Client ID e a referência ao segredo.
-- Nada disso é legível pelo navegador: o app vê apenas se está configurado, o final do Client ID e quando foi testado.

create table private.pluggy_credentials (
  owner_id uuid primary key references public.profiles(id) on delete cascade,
  client_id text not null check (char_length(client_id) between 8 and 200 and client_id !~ '\s'),
  secret_id uuid not null,
  tested_at timestamptz not null,
  updated_at timestamptz not null default now()
);
revoke all on table private.pluggy_credentials from public, anon, authenticated;

-- Grava (ou troca) as chaves depois que a Edge Function testou com o Pluggy. Só o backend chama.
create function public.internal_set_pluggy_credentials(p_owner_id uuid, p_client_id text, p_client_secret text)
returns timestamptz
language plpgsql security definer set search_path = public, pg_temp as $$
declare existing uuid; secret uuid; tested timestamptz := now();
begin
  if p_owner_id is null or not exists (select 1 from public.profiles where id = p_owner_id and is_owner) then
    raise exception 'Owner required';
  end if;
  if p_client_id is null or char_length(p_client_id) not between 8 and 200 or p_client_id ~ '\s' then raise exception 'Invalid client id'; end if;
  if p_client_secret is null or char_length(p_client_secret) not between 8 and 400 or p_client_secret ~ '\s' then raise exception 'Invalid client secret'; end if;
  select secret_id into existing from private.pluggy_credentials where owner_id = p_owner_id;
  if existing is null then
    secret := vault.create_secret(p_client_secret, 'pluggy_client_secret_' || p_owner_id::text, 'Pluggy Client Secret (D-064)');
    insert into private.pluggy_credentials (owner_id, client_id, secret_id, tested_at) values (p_owner_id, p_client_id, secret, tested);
  else
    perform vault.update_secret(existing, p_client_secret);
    update private.pluggy_credentials set client_id = p_client_id, tested_at = tested, updated_at = now() where owner_id = p_owner_id;
  end if;
  return tested;
end;
$$;

-- Lido só pelas Edge Functions (service_role) para falar com o Pluggy.
create function public.internal_get_pluggy_credentials(p_owner_id uuid)
returns table (client_id text, client_secret text)
language sql stable security definer set search_path = public, pg_temp as $$
  select c.client_id, s.decrypted_secret
  from private.pluggy_credentials c join vault.decrypted_secrets s on s.id = c.secret_id
  where c.owner_id = p_owner_id;
$$;

revoke all on function public.internal_set_pluggy_credentials(uuid, text, text) from public, anon, authenticated;
revoke all on function public.internal_get_pluggy_credentials(uuid) from public, anon, authenticated;
grant execute on function public.internal_set_pluggy_credentials(uuid, text, text) to service_role;
grant execute on function public.internal_get_pluggy_credentials(uuid) to service_role;

-- O que o app pode saber: configurado?, final do Client ID e data do teste. Nunca o segredo.
create function public.get_pluggy_credentials_status()
returns table (configured boolean, client_id_suffix text, tested_at timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select true, right(c.client_id, 4), c.tested_at from private.pluggy_credentials c where c.owner_id = (select auth.uid())
  union all
  select false, null, null where not exists (select 1 from private.pluggy_credentials c where c.owner_id = (select auth.uid()));
$$;
revoke all on function public.get_pluggy_credentials_status() from public, anon;
grant execute on function public.get_pluggy_credentials_status() to authenticated;
