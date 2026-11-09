-- Somente mock. Não existem tokens de banco, credenciais comerciais ou endpoint público de webhook.
create table public.open_finance_connections (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id),account_id uuid not null,
 provider_code text not null default 'mock' check(provider_code='mock'), institution text not null check(institution in ('Itaú','Nubank','Caixa')),
 status text not null default 'pending' check(status in ('pending','active','expired','revoked','error','reauthorization_required')),
 scopes text[] not null check(cardinality(scopes)>0 and scopes <@ array['accounts','transactions','credit_cards']),
 expires_at timestamptz not null default(now()+interval '90 days'),last_sync_at timestamptz,cursor integer not null default 0,
 created_at timestamptz not null default now(),unique(workspace_id,id),foreign key(workspace_id,account_id) references public.financial_accounts(workspace_id,id)
);
create table public.open_finance_consents (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id),connection_id uuid not null,
 action text not null check(action in ('authorize','renew','revoke')),scopes text[] not null,expires_at timestamptz not null,
 actor_user_id uuid not null default auth.uid(),created_at timestamptz not null default now(),unique(workspace_id,id),
 foreign key(workspace_id,connection_id) references public.open_finance_connections(workspace_id,id)
);
create table public.open_finance_sync_runs (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id),connection_id uuid not null,
 status text not null check(status in ('success','error')),batch_id uuid,rows_received integer not null default 0,
 error_code text,created_at timestamptz not null default now(),unique(workspace_id,id),
 foreign key(workspace_id,connection_id) references public.open_finance_connections(workspace_id,id),
 foreign key(workspace_id,batch_id) references public.import_batches(workspace_id,id)
);
create table private.connection_intents (
 connection_id uuid primary key references public.open_finance_connections(id),state uuid not null default gen_random_uuid(),
 user_id uuid not null references auth.users(id),expires_at timestamptz not null default(now()+interval '10 minutes')
);
revoke all on private.connection_intents from public,anon,authenticated;
do $$ declare t text;begin
 foreach t in array array['open_finance_connections','open_finance_consents','open_finance_sync_runs'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('create policy tenant_read on public.%I for select to authenticated using(public.owns_workspace(workspace_id))',t);
 execute format('create trigger audit_change after insert or update on public.%I for each row execute function private.audit_change()',t);
 end loop;
end $$;
create function public.mock_connection_intent(account uuid, institution text, scopes text[]) returns jsonb language plpgsql security definer set search_path='' as $$
declare w uuid:=public.my_workspace(); c uuid; s uuid;
begin
 if w is null or not exists(select 1 from public.financial_accounts where id=account and workspace_id=w and not archived) then raise exception 'Acesso negado'; end if;
 if institution='Caixa' and 'credit_cards'=any(scopes) then raise exception 'Cobertura parcial do cenário mock: cartões indisponíveis'; end if;
 insert into public.open_finance_connections(workspace_id,account_id,institution,scopes) values(w,account,institution,scopes) returning id into c;
 insert into private.connection_intents(connection_id,user_id) values(c,auth.uid()) returning state into s;
 return jsonb_build_object('connection_id',c,'state',s,'provider','mock');
end $$;
create function public.mock_authorize(connection uuid, state uuid) returns void language plpgsql security definer set search_path='' as $$
declare w uuid:=public.my_workspace(); c public.open_finance_connections;
begin
 select * into c from public.open_finance_connections where id=connection and workspace_id=w for update;
 if not found or c.status<>'pending' then raise exception 'Conexão indisponível'; end if;
 delete from private.connection_intents i where i.connection_id=connection and i.state=mock_authorize.state and i.user_id=auth.uid() and i.expires_at>now();
 if not found then raise exception 'Autorização inválida ou expirada'; end if;
 update public.open_finance_connections set status='active',expires_at=now()+interval '90 days' where id=connection and workspace_id=w;
 insert into public.open_finance_consents(workspace_id,connection_id,action,scopes,expires_at) values(w,connection,'authorize',c.scopes,now()+interval '90 days');
end $$;
create function public.mock_consent_action(connection uuid, action text) returns void language plpgsql security definer set search_path='' as $$
declare w uuid:=public.my_workspace(); c public.open_finance_connections;
begin
 select * into c from public.open_finance_connections where id=connection and workspace_id=w for update;
 if not found or action not in ('renew','revoke') then raise exception 'Conexão indisponível'; end if;
 if action='renew' and c.status='pending' then raise exception 'Autorize o consentimento inicial'; end if;
 update public.open_finance_connections set status=case action when 'revoke' then 'revoked' else 'active' end,
 expires_at=case action when 'renew' then now()+interval '90 days' else expires_at end where id=connection and workspace_id=w;
 delete from private.connection_intents where connection_id=connection;
 insert into public.open_finance_consents(workspace_id,connection_id,action,scopes,expires_at) values(w,connection,action,c.scopes,case action when 'renew' then now()+interval '90 days' else c.expires_at end);
end $$;
create function public.mock_sync(connection uuid, simulate_failure boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare w uuid:=public.my_workspace(); c public.open_finance_connections; b uuid; rows jsonb; date_text text;
begin
 select * into c from public.open_finance_connections where id=connection and workspace_id=w for update;
 if not found then raise exception 'Conexão indisponível'; end if;
 if c.status<>'active' or c.expires_at<=now() then raise exception 'Consentimento inativo ou expirado'; end if;
 if not 'transactions'=any(c.scopes) then raise exception 'Escopo de transações não autorizado'; end if;
 if simulate_failure then
 insert into public.open_finance_sync_runs(workspace_id,connection_id,status,error_code) values(w,connection,'error','MOCK_NETWORK_ERROR');
 return jsonb_build_object('status','error','retryable',true);
 end if;
 if c.cursor>=3 then return jsonb_build_object('status','success','rows',0,'has_more',false); end if;
 date_text:=(date '2026-01-10'+c.cursor)::text;
 rows:=jsonb_build_array(jsonb_build_object('description','Compra fictícia sandbox '||(c.cursor+1),'amount_cents','-2500','event_date',date_text,'bank_date',date_text,'competence','2026-01-01','nature','expense','external_key','mock:'||c.institution||':purchase:'||c.cursor));
 b:=public.stage_import(c.account_id,'mock:'||c.id||':page:'||c.cursor,'mock-v1',rows);
 update public.open_finance_connections set cursor=cursor+1,last_sync_at=now() where id=connection and workspace_id=w;
 insert into public.open_finance_sync_runs(workspace_id,connection_id,status,batch_id,rows_received) values(w,connection,'success',b,1);
 return jsonb_build_object('status','success','rows',1,'has_more',c.cursor<2,'batch_id',b);
end $$;
revoke all on function public.mock_connection_intent(uuid,text,text[]), public.mock_authorize(uuid,uuid), public.mock_consent_action(uuid,text),public.mock_sync(uuid,boolean) from public;
grant execute on function public.mock_connection_intent(uuid,text,text[]), public.mock_authorize(uuid,uuid), public.mock_consent_action(uuid,text),public.mock_sync(uuid,boolean) to authenticated;

-- Envolve o snapshot financeiro já autorizado, sem aceitar workspace do cliente.
alter function public.workspace_snapshot() rename to financial_snapshot;
revoke all on function public.financial_snapshot() from public,authenticated;
create function public.workspace_snapshot() returns jsonb language plpgsql security definer set search_path='' as $$
declare w uuid:=public.my_workspace(); result jsonb; t text; data jsonb;
begin
 if w is null then raise exception 'Acesso negado'; end if;
 result:=public.financial_snapshot();
 foreach t in array array['open_finance_connections','open_finance_consents','open_finance_sync_runs'] loop
 execute format('select coalesce(jsonb_agg(to_jsonb(x) order by id),''[]''::jsonb) from public.%I x where workspace_id=$1',t) into data using w;
 result:=result||jsonb_build_object(t,data);
 end loop;return result;
end $$;
revoke all on function public.workspace_snapshot() from public;
grant execute on function public.workspace_snapshot() to authenticated;
