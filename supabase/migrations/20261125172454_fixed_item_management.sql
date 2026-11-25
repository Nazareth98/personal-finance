-- D-084 / etapa 12.2: renomear, trocar categoria e encerrar (ou reativar) um fixo. Encerrar tira o fixo das
-- previsoes e do vinculo automatico, sem apagar vinculos nem historico. Arquivo so em ASCII.

create function public.update_fixed_item(p_fixed_item_id uuid, p_name text, p_category_id text) returns void
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare current_owner uuid := private.require_owner();
begin
  update public.fixed_items
  set name = trim(p_name), category_id = nullif(p_category_id, ''), updated_at = now()
  where id = p_fixed_item_id and owner_id = current_owner;
  if not found then raise exception 'Fixed item not available'; end if;
end;
$$;
revoke all on function public.update_fixed_item(uuid, text, text) from public, anon;
grant execute on function public.update_fixed_item(uuid, text, text) to authenticated;

create function public.set_fixed_item_ended(p_fixed_item_id uuid, p_ended boolean) returns void
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare current_owner uuid := private.require_owner();
begin
  update public.fixed_items
  set ended_at = case when p_ended then now() else null end, updated_at = now()
  where id = p_fixed_item_id and owner_id = current_owner;
  if not found then raise exception 'Fixed item not available'; end if;
end;
$$;
revoke all on function public.set_fixed_item_ended(uuid, boolean) from public, anon;
grant execute on function public.set_fixed_item_ended(uuid, boolean) to authenticated;
