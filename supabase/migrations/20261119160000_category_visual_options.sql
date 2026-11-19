-- D-059: mais ícones (20 → 40) e cores (5 → 10) para categorias. As listas passam a viver em duas funções
-- imutáveis, usadas pelas restrições da tabela e pelas RPCs, em vez de três cópias de cada lista.
-- Só amplia o conjunto aceito: nenhuma linha existente muda.

create function private.is_category_icon_key(p_key text) returns boolean
language sql immutable set search_path = pg_temp as $$
  select p_key = any (array[
    'home', 'receipt', 'shopping-cart', 'utensils', 'car', 'bus', 'fuel',
    'heart-pulse', 'sparkles', 'gamepad', 'repeat', 'graduation-cap', 'plane',
    'landmark', 'gift', 'briefcase', 'wallet', 'arrow-left-right', 'piggy-bank', 'tag',
    'paw-print', 'shirt', 'smartphone', 'wifi', 'zap', 'droplet', 'book-open', 'music',
    'dumbbell', 'coffee', 'film', 'scissors', 'wrench', 'pill', 'shield', 'percent',
    'trending-up', 'hand-heart', 'ticket', 'bike'
  ]);
$$;

create function private.is_category_color_key(p_key text) returns boolean
language sql immutable set search_path = pg_temp as $$
  select p_key = any (array[
    'chart-category-1', 'chart-category-2', 'chart-category-3', 'chart-category-4', 'chart-category-5',
    'chart-category-6', 'chart-category-7', 'chart-category-8', 'chart-category-9', 'chart-category-10'
  ]);
$$;

-- EXECUTE continua público de propósito: a restrição roda com o papel de quem grava, e as funções só
-- comparam o texto recebido com a lista (sem acesso a dados).

alter table public.categories
  drop constraint categories_icon_key_check,
  add constraint categories_icon_key_check check (private.is_category_icon_key(icon_key)),
  drop constraint categories_color_key_check,
  add constraint categories_color_key_check check (private.is_category_color_key(color_key));

create or replace function public.create_category(
  p_name text,
  p_applicability text,
  p_icon_key text,
  p_color_key text
) returns text
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare
  current_owner uuid := private.require_owner();
  new_id text := 'custom_' || replace(gen_random_uuid()::text, '-', '');
  next_order integer;
begin
  p_name := trim(p_name);
  if char_length(p_name) not between 2 and 60 then raise exception 'Category name must have between 2 and 60 characters'; end if;
  if p_applicability not in ('income', 'expense', 'neutral') then raise exception 'Invalid category applicability'; end if;
  if not coalesce(private.is_category_icon_key(p_icon_key), false) then raise exception 'Invalid category icon'; end if;
  if not coalesce(private.is_category_color_key(p_color_key), false) then raise exception 'Invalid category color'; end if;
  if exists (select 1 from public.categories where lower(name) = lower(p_name) and (category_type = 'system' or owner_id = current_owner)) then
    raise exception 'Category name already exists';
  end if;
  select coalesce(max(sort_order), 0) + 10 into next_order
  from public.categories where category_type = 'system' or owner_id = current_owner;
  insert into public.categories (id, owner_id, name, sort_order, category_type, applicability, icon_key, color_key)
  values (new_id, current_owner, p_name, next_order, 'custom', p_applicability, p_icon_key, p_color_key);
  return new_id;
end;
$$;

create or replace function public.update_category(
  p_category_id text,
  p_name text,
  p_icon_key text,
  p_color_key text
) returns void
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare current_owner uuid := private.require_owner();
begin
  p_name := trim(p_name);
  if char_length(p_name) not between 2 and 60 then raise exception 'Category name must have between 2 and 60 characters'; end if;
  if not coalesce(private.is_category_icon_key(p_icon_key), false) then raise exception 'Invalid category icon'; end if;
  if not coalesce(private.is_category_color_key(p_color_key), false) then raise exception 'Invalid category color'; end if;
  if exists (select 1 from public.categories where id <> p_category_id and lower(name) = lower(p_name) and (category_type = 'system' or owner_id = current_owner)) then
    raise exception 'Category name already exists';
  end if;
  update public.categories set name = p_name, icon_key = p_icon_key, color_key = p_color_key, updated_at = now()
  where id = p_category_id and owner_id = current_owner and category_type = 'custom';
  if not found then raise exception 'Custom category not available'; end if;
end;
$$;

revoke all on function public.create_category(text, text, text, text) from public, anon;
revoke all on function public.update_category(text, text, text, text) from public, anon;
grant execute on function public.create_category(text, text, text, text) to authenticated;
grant execute on function public.update_category(text, text, text, text) to authenticated;
