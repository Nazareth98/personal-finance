create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  is_owner boolean not null default false,
  created_at timestamptz not null default now(),
  constraint profiles_owner_required check (is_owner)
);

create unique index profiles_single_owner on public.profiles (is_owner) where is_owner;

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;

create policy "owner reads own profile"
on public.profiles
for select
to authenticated
using (
  (select auth.uid()) is not null
  and id = (select auth.uid())
  and is_owner
);

comment on table public.profiles is 'Allowlist do único proprietário autorizado.';
