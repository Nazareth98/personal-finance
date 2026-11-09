alter function public.workspace_snapshot() rename to snapshot_before_profile;
revoke all on function public.snapshot_before_profile() from public,authenticated;
create function public.workspace_snapshot() returns jsonb language plpgsql security definer set search_path='' as $$
declare w uuid:=public.my_workspace();result jsonb;
begin
 if w is null then raise exception 'Acesso negado';end if;
 result:=public.snapshot_before_profile();
 return result||jsonb_build_object('profile',(select to_jsonb(p) from public.profiles p where p.id=auth.uid()),'workspace',(select to_jsonb(s) from public.workspaces s where s.id=w and s.owner_id=auth.uid()));
end $$;
revoke all on function public.workspace_snapshot() from public;grant execute on function public.workspace_snapshot() to authenticated;
alter function public.restore_backup(jsonb,boolean) rename to restore_before_profile;
revoke all on function public.restore_before_profile(jsonb,boolean) from public,authenticated;
create function public.restore_backup(backup jsonb,confirmed boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Acesso negado';end if;
 if backup ? 'profile' and (backup->'profile'->>'id')::uuid is distinct from auth.uid() then raise exception 'Perfil de outro usuário';end if;
 if backup ? 'workspace' and (backup->'workspace'->>'owner_id')::uuid is distinct from auth.uid() then raise exception 'Proprietário incompatível';end if;
 -- Perfil existente é preservado; restauração continua aditiva, nunca substitutiva.
 return public.restore_before_profile(backup,confirmed);
end $$;
revoke all on function public.restore_backup(jsonb,boolean) from public;grant execute on function public.restore_backup(jsonb,boolean) to authenticated;
