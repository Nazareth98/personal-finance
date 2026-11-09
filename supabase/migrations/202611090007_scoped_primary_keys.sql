-- Um UUID financeiro só é identidade dentro do workspace. Isso também evita
-- sondagem de existência via colisão de PK ao restaurar um backup legítimo.
alter table private.connection_intents add column workspace_id uuid;
update private.connection_intents i set workspace_id=c.workspace_id from public.open_finance_connections c where c.id=i.connection_id;
alter table private.connection_intents alter column workspace_id set not null;
alter table private.connection_intents drop constraint connection_intents_connection_id_fkey;
alter table private.connection_intents drop constraint connection_intents_pkey;
alter table private.connection_intents add primary key(workspace_id,connection_id);
alter table private.connection_intents add foreign key(workspace_id,connection_id) references public.open_finance_connections(workspace_id,id);
do $$ declare t text;begin
 foreach t in array array['financial_accounts','categories','subcategories','categorization_rules','credit_cards','budget_allocations','savings_goals','payslips','transactions','import_batches','import_raw_rows','review_decisions','source_links','audit_events','open_finance_connections','open_finance_consents','open_finance_sync_runs','billing_statements','billing_payments','installment_purchases','installment_occurrences','payslip_items','payslip_bases','transaction_classifications'] loop
 execute format('alter table public.%I drop constraint %I',t,t||'_pkey');
 execute format('alter table public.%I add primary key(workspace_id,id)',t);
 end loop;
end $$;
create function private.scope_intent() returns trigger language plpgsql security definer set search_path='' as $$
begin
 new.workspace_id:=public.my_workspace();
 if new.workspace_id is null or new.user_id is distinct from auth.uid() then raise exception 'Acesso negado';end if;
 return new;
end $$;
revoke all on function private.scope_intent() from public;
create trigger scope_intent before insert on private.connection_intents for each row execute function private.scope_intent();
create or replace function public.mock_consent_action(connection uuid, action text) returns void language plpgsql security definer set search_path='' as $$
declare w uuid:=public.my_workspace();c public.open_finance_connections;
begin
 select * into c from public.open_finance_connections where id=connection and workspace_id=w for update;
 if not found or action not in ('renew','revoke') then raise exception 'Conexão indisponível';end if;
 if action='renew' and c.status='pending' then raise exception 'Autorize o consentimento inicial';end if;
 update public.open_finance_connections set status=case action when 'revoke' then 'revoked' else 'active' end,
 expires_at=case action when 'renew' then now()+interval '90 days' else expires_at end where id=connection and workspace_id=w;
 delete from private.connection_intents where connection_id=connection and workspace_id=w and user_id=auth.uid();
 insert into public.open_finance_consents(workspace_id,connection_id,action,scopes,expires_at) values(w,connection,action,c.scopes,case action when 'renew' then now()+interval '90 days' else c.expires_at end);
end $$;
update storage.buckets set public=false where id='financial-files';
