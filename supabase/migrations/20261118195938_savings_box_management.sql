-- Edição e exclusão de caixinhas (D-039).
-- Caixinha sem histórico é excluída; com movimentos ou vínculos semânticos é arquivada,
-- para que aportes e resgates continuem rastreáveis no livro.

-- O nome só precisa ser único entre caixinhas ativas: arquivar "Viagem" não impede criar outra "Viagem".
alter table public.savings_boxes drop constraint savings_boxes_owner_id_name_key;
create unique index savings_boxes_owner_active_name on public.savings_boxes (owner_id, name) where archived_at is null;

create function public.update_savings_box(
  p_savings_box_id uuid, p_name text, p_opening_balance_cents bigint, p_target_cents bigint, p_target_date date default null
) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  current_owner uuid := auth.uid();
  movement_net bigint;
begin
  if current_owner is null then raise exception 'Authentication required'; end if;
  if char_length(trim(p_name)) not between 2 and 80 then raise exception 'Invalid savings box name'; end if;
  if p_opening_balance_cents < 0 or p_target_cents <= 0 then raise exception 'Invalid savings box values'; end if;

  perform 1 from public.savings_boxes
  where id = p_savings_box_id and owner_id = current_owner and archived_at is null for update;
  if not found then raise exception 'Savings box not available'; end if;

  select coalesce(sum(case when movement_type = 'contribution' then amount_cents else -amount_cents end), 0)
  into movement_net from public.savings_movements where savings_box_id = p_savings_box_id;
  if p_opening_balance_cents + movement_net < 0 then raise exception 'Savings box balance would be negative'; end if;

  update public.savings_boxes
  set name = trim(p_name), opening_balance_cents = p_opening_balance_cents,
      target_cents = p_target_cents, target_date = p_target_date
  where id = p_savings_box_id;
end;
$$;

create function public.delete_savings_box(p_savings_box_id uuid) returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  current_owner uuid := auth.uid();
begin
  if current_owner is null then raise exception 'Authentication required'; end if;
  perform 1 from public.savings_boxes
  where id = p_savings_box_id and owner_id = current_owner and archived_at is null for update;
  if not found then raise exception 'Savings box not available'; end if;

  if exists (select 1 from public.savings_movements where savings_box_id = p_savings_box_id)
    or exists (select 1 from public.transaction_semantic_overrides where savings_box_id = p_savings_box_id) then
    update public.savings_boxes set archived_at = now() where id = p_savings_box_id;
    return 'archived';
  end if;

  delete from public.savings_boxes where id = p_savings_box_id;
  return 'deleted';
end;
$$;

revoke all on function public.update_savings_box(uuid, text, bigint, bigint, date) from public, anon;
revoke all on function public.delete_savings_box(uuid) from public, anon;
grant execute on function public.update_savings_box(uuid, text, bigint, bigint, date) to authenticated;
grant execute on function public.delete_savings_box(uuid) to authenticated;
