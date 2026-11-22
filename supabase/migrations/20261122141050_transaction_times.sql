-- D-074: hora do lancamento. A Pluggy manda a data com hora (ISO 8601, UTC); guardamos o instante em
-- `occurred_at`. Lancamento importado continua imutavel: so o backend preenche a hora, e so quando ela ainda falta.
-- Cada conexao faz uma sincronizacao completa uma vez (`times_backfilled_at`) para preencher o historico.
-- Arquivo so em ASCII (D-069).

alter table public.transactions add column occurred_at timestamptz;
alter table public.pluggy_connections add column times_backfilled_at timestamptz;

create or replace function private.prevent_imported_transaction_mutation() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if old.source = 'pluggy' then
    if tg_op = 'UPDATE'
      and new.source = 'pluggy'
      and (to_jsonb(new) - 'source_deleted_at' - 'competence' - 'occurred_at') = (to_jsonb(old) - 'source_deleted_at' - 'competence' - 'occurred_at')
      and (new.competence = old.competence or auth.uid() is null)
      and (new.occurred_at is not distinct from old.occurred_at or (old.occurred_at is null and auth.uid() is null)) then
      return new;
    end if;
    raise exception 'Imported transactions are immutable';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.prevent_imported_transaction_mutation() from public, anon, authenticated;

create function public.internal_set_transaction_times(p_owner uuid, p_rows jsonb) returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare changed integer;
begin
  update public.transactions t
  set occurred_at = (r->>'occurred_at')::timestamptz
  from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) r
  where t.owner_id = p_owner and t.source = 'pluggy' and t.occurred_at is null
    and t.external_key = r->>'external_key' and r->>'occurred_at' is not null;
  get diagnostics changed = row_count;
  return changed;
end;
$$;

revoke all on function public.internal_set_transaction_times(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.internal_set_transaction_times(uuid, jsonb) to service_role;
