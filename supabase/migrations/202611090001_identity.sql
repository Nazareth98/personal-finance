-- Identidade: posse definida exclusivamente no backend.
create schema if not exists private;
revoke all on schema private from public;
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (length(display_name) <= 100),
  locale text not null default 'pt-BR' check (locale = 'pt-BR'),
  timezone text not null default 'America/Sao_Paulo',
  deletion_requested_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null default 'Meu espaço pessoal',
  kind text not null default 'personal' check (kind = 'personal'),
  created_at timestamptz not null default now(),
  unique(id, owner_id)
);
create table public.workspace_members (
  workspace_id uuid primary key,
  user_id uuid not null unique,
  role text not null default 'owner' check (role = 'owner'),
  foreign key(workspace_id, user_id) references public.workspaces(id, owner_id) on delete cascade
);
create function private.provision_user() returns trigger language plpgsql security definer set search_path = '' as $$
declare w uuid;
begin
  insert into public.profiles(id) values(new.id);
  insert into public.workspaces(owner_id) values(new.id) returning id into w;
  insert into public.workspace_members(workspace_id,user_id) values(w,new.id);
  return new;
end $$;
revoke all on function private.provision_user() from public;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.provision_user();

create function public.owns_workspace(w uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.workspace_members m where m.workspace_id=w and m.user_id=(select auth.uid()));
$$;
revoke all on function public.owns_workspace(uuid) from public;
grant execute on function public.owns_workspace(uuid) to authenticated;
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
revoke all on public.profiles,public.workspaces,public.workspace_members from anon,authenticated;
grant select on public.profiles,public.workspaces,public.workspace_members to authenticated;
grant update(display_name, deletion_requested_at) on public.profiles to authenticated;
create policy own_profile on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy edit_profile on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy own_workspace on public.workspaces for select to authenticated using(owner_id=(select auth.uid()));
create policy own_membership on public.workspace_members for select to authenticated using(user_id=(select auth.uid()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('financial-files','financial-files',false,10485760,array['text/csv','application/pdf','application/x-ofx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict(id) do nothing;
-- Não faz cast de caminhos controlados pelo cliente. Nenhum arquivo público.
create function public.owns_storage_path(path text) returns boolean language sql stable security definer set search_path = '' as $$
 select path !~ '(^|/)\.\.(/|$)' and exists (
   select 1 from public.workspace_members m where m.user_id=(select auth.uid()) and m.workspace_id::text=split_part(path,'/',1)
 ) and array_length(string_to_array(path,'/'),1)=2 and split_part(path,'/',2)<>'';
$$;
revoke all on function public.owns_storage_path(text) from public;
grant execute on function public.owns_storage_path(text) to authenticated;
create policy own_files_read on storage.objects for select to authenticated using(bucket_id='financial-files' and public.owns_storage_path(name));
create policy own_files_insert on storage.objects for insert to authenticated with check(bucket_id='financial-files' and public.owns_storage_path(name));
create policy own_files_delete on storage.objects for delete to authenticated using(bucket_id='financial-files' and public.owns_storage_path(name));
