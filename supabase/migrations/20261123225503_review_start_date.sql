alter table public.profiles add column review_start_date date;
alter table public.profiles add constraint profiles_review_start_date_valid
  check (review_start_date is null or review_start_date between date '0001-01-01' and date '9999-12-31');

-- Only this preference is editable; identity and owner privileges remain administrative.
revoke update on public.profiles from public, anon, authenticated;
grant update (review_start_date) on public.profiles to authenticated;

create policy "owner updates review start date"
on public.profiles for update to authenticated
using (id = (select auth.uid()) and is_owner)
with check (id = (select auth.uid()) and is_owner);
