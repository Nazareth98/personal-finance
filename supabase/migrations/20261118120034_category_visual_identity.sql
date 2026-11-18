alter table public.categories
  add column icon_key text not null default 'tag'
    check (icon_key in (
      'home', 'receipt', 'shopping-cart', 'utensils', 'car', 'bus', 'fuel',
      'heart-pulse', 'sparkles', 'gamepad', 'repeat', 'graduation-cap', 'plane',
      'landmark', 'gift', 'briefcase', 'wallet', 'arrow-left-right', 'piggy-bank', 'tag'
    )),
  add column color_key text not null default 'chart-category-5'
    check (color_key in (
      'chart-category-1', 'chart-category-2', 'chart-category-3',
      'chart-category-4', 'chart-category-5'
    ));

update public.categories set
  icon_key = case id
    when 'housing' then 'home'
    when 'home_bills' then 'receipt'
    when 'groceries' then 'shopping-cart'
    when 'delivery' then 'utensils'
    when 'restaurants' then 'utensils'
    when 'ride_hailing' then 'car'
    when 'public_transport' then 'bus'
    when 'fuel' then 'fuel'
    when 'health' then 'heart-pulse'
    when 'personal_care' then 'sparkles'
    when 'leisure' then 'gamepad'
    when 'subscriptions' then 'repeat'
    when 'education' then 'graduation-cap'
    when 'travel' then 'plane'
    when 'taxes' then 'landmark'
    when 'fees_interest' then 'receipt'
    when 'gifts' then 'gift'
    when 'salary' then 'briefcase'
    when 'other_recurring_income' then 'wallet'
    when 'extraordinary_income' then 'sparkles'
    when 'transfers' then 'arrow-left-right'
    when 'savings' then 'piggy-bank'
    else 'tag'
  end,
  color_key = case id
    when 'housing' then 'chart-category-1'
    when 'home_bills' then 'chart-category-5'
    when 'groceries' then 'chart-category-2'
    when 'delivery' then 'chart-category-4'
    when 'restaurants' then 'chart-category-3'
    when 'ride_hailing' then 'chart-category-1'
    when 'public_transport' then 'chart-category-2'
    when 'fuel' then 'chart-category-4'
    when 'health' then 'chart-category-2'
    when 'personal_care' then 'chart-category-3'
    when 'leisure' then 'chart-category-3'
    when 'subscriptions' then 'chart-category-1'
    when 'education' then 'chart-category-2'
    when 'travel' then 'chart-category-1'
    when 'taxes' then 'chart-category-4'
    when 'fees_interest' then 'chart-category-4'
    when 'gifts' then 'chart-category-3'
    when 'salary' then 'chart-category-2'
    when 'other_recurring_income' then 'chart-category-1'
    when 'extraordinary_income' then 'chart-category-4'
    when 'transfers' then 'chart-category-1'
    when 'savings' then 'chart-category-2'
    else 'chart-category-5'
  end;

drop function public.create_category(text, text);
drop function public.rename_category(text, text);

create function public.create_category(
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
  if p_icon_key not in (
    'home', 'receipt', 'shopping-cart', 'utensils', 'car', 'bus', 'fuel',
    'heart-pulse', 'sparkles', 'gamepad', 'repeat', 'graduation-cap', 'plane',
    'landmark', 'gift', 'briefcase', 'wallet', 'arrow-left-right', 'piggy-bank', 'tag'
  ) then raise exception 'Invalid category icon'; end if;
  if p_color_key not in (
    'chart-category-1', 'chart-category-2', 'chart-category-3', 'chart-category-4', 'chart-category-5'
  ) then raise exception 'Invalid category color'; end if;
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

create function public.update_category(
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
  if p_icon_key not in (
    'home', 'receipt', 'shopping-cart', 'utensils', 'car', 'bus', 'fuel',
    'heart-pulse', 'sparkles', 'gamepad', 'repeat', 'graduation-cap', 'plane',
    'landmark', 'gift', 'briefcase', 'wallet', 'arrow-left-right', 'piggy-bank', 'tag'
  ) then raise exception 'Invalid category icon'; end if;
  if p_color_key not in (
    'chart-category-1', 'chart-category-2', 'chart-category-3', 'chart-category-4', 'chart-category-5'
  ) then raise exception 'Invalid category color'; end if;
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
