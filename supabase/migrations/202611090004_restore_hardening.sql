-- IDs de cadastros são gerados no servidor. Impede sondar UUIDs de terceiros por UNIQUE.
do $$ declare t text; cols text; editable text; begin
 foreach t in array array['financial_accounts','categories','subcategories','categorization_rules','credit_cards','budget_allocations','savings_goals','payslips'] loop
  select string_agg(quote_ident(column_name),',' order by ordinal_position) into cols from information_schema.columns
   where table_schema='public' and table_name=t and column_name not in ('id','created_at');
  select string_agg(quote_ident(column_name),',' order by ordinal_position) into editable from information_schema.columns
   where table_schema='public' and table_name=t and column_name not in ('id','workspace_id','created_at');
  execute format('revoke insert,update on public.%I from authenticated',t);
  execute format('grant insert(%s), update(%s) on public.%I to authenticated',cols,editable,t);
 end loop;
end $$;
create function private.validate_account_reference() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='credit_cards' and not exists(select 1 from public.financial_accounts where workspace_id=new.workspace_id and id=new.account_id and kind='credit') then raise exception 'Configuração exige conta de cartão'; end if;
 if tg_table_name='savings_goals' and not exists(select 1 from public.financial_accounts where workspace_id=new.workspace_id and id=new.account_id and kind='savings') then raise exception 'Objetivo exige conta de investimento'; end if;
 return new;
end $$;
revoke all on function private.validate_account_reference() from public;
create trigger validate_account before insert or update on public.credit_cards for each row execute function private.validate_account_reference();
create trigger validate_account before insert or update on public.savings_goals for each row execute function private.validate_account_reference();
create function private.guard_account_kind() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.kind<>new.kind then raise exception 'Tipo de conta é imutável; crie outra conta'; end if;
 return new;
end $$;
revoke all on function private.guard_account_kind() from public;
create trigger guard_account_kind before update on public.financial_accounts for each row execute function private.guard_account_kind();

create function public.restore_backup(backup jsonb, confirmed boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare w uuid:=public.my_workspace(); t text; r jsonb; normalized jsonb; existing jsonb; total integer:=0; inserted integer:=0; count_rows integer; cols text;
begin
 if w is null or not public.owns_workspace(w) or (backup->>'workspace_id')::uuid is distinct from w or backup->>'version' is distinct from '1' then raise exception 'Backup incompatível com seu workspace'; end if;
 -- Serializa restaurações do mesmo workspace; nenhuma substituição ou exclusão.
 perform 1 from public.workspaces where id=w for update;
 foreach t in array array['financial_accounts','categories','subcategories','categorization_rules','credit_cards','budget_allocations','savings_goals','payslips','transactions','import_batches','import_raw_rows','review_decisions','source_links','open_finance_connections','open_finance_consents','open_finance_sync_runs','audit_events'] loop
  if jsonb_typeof(backup->t) is distinct from 'array' then raise exception 'Backup incompleto'; end if;
  total:=total+jsonb_array_length(backup->t);
  if total>50000 then raise exception 'Backup acima de 50000 registros: use restauração operacional'; end if;
  for r in select value from jsonb_array_elements(backup->t) loop
   if (r->>'workspace_id')::uuid is distinct from w or r->>'id' is null then raise exception 'Registro de outro workspace'; end if;
   if r ? 'created_by' and (r->>'created_by')::uuid is distinct from auth.uid() then raise exception 'Autor incompatível'; end if;
   if r ? 'actor_user_id' and r->>'actor_user_id' is not null and (r->>'actor_user_id')::uuid is distinct from auth.uid() then raise exception 'Ator incompatível'; end if;
   -- Validar tipos via row type do banco; ignora campos desconhecidos, nunca SQL do arquivo.
   execute format('select private.money_json(to_jsonb(jsonb_populate_record(null::public.%I,$1)))',t) into normalized using r;
   execute format('select private.money_json(to_jsonb(x)) from public.%I x where workspace_id=$1 and id=$2',t) into existing using w,(r->>'id')::uuid;
   if existing is not null then
    if existing<>normalized and not(t='open_finance_connections' and existing=normalized||jsonb_build_object('status','revoked')) then raise exception 'Conflito com registro existente; nada foi sobrescrito'; end if;
    continue;
   end if;
   inserted:=inserted+1;
   if confirmed then
    if t='open_finance_connections' then normalized:=normalized||jsonb_build_object('status','revoked'); end if;
    -- Colunas explícitas para evitar depender de ordem e manter defaults verificáveis.
    select string_agg(quote_ident(column_name),',' order by ordinal_position) into cols from information_schema.columns where table_schema='public' and table_name=t;
    execute format('insert into public.%I(%s) select %s from jsonb_populate_record(null::public.%I,$1)',t,cols,cols,t) using normalized;
   end if;
  end loop;
 end loop;
 if confirmed then
  -- Relações e pares patrimoniais também são invariantes de restauração.
  select count(*) into count_rows from public.transactions a where a.workspace_id=w and a.nature in ('transfer','contribution','redemption','card_payment') and not exists(
   select 1 from public.transactions b where b.workspace_id=w and b.account_id<>a.account_id and b.amount_cents=-a.amount_cents and b.nature=a.nature and b.status=a.status and (a.related_id=b.id or b.related_id=a.id));
  if count_rows>0 then raise exception 'Backup contém movimento patrimonial sem par'; end if;
  insert into public.audit_events(workspace_id,entity,entity_id,action) values(w,'workspaces',w,'RESTORE');
 end if;
 return jsonb_build_object('total',total,'new',inserted,'existing',total-inserted,'applied',confirmed);
end $$;
revoke all on function public.restore_backup(jsonb,boolean) from public;
grant execute on function public.restore_backup(jsonb,boolean) to authenticated;
