create domain public.cents as bigint check(value between -9000000000000 and 9000000000000);
create table public.financial_accounts (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
 name text not null check(length(name) between 1 and 100), institution text not null default 'Outra',
 kind text not null check(kind in ('checking','cash','credit','benefit','savings','loan')),
 opening_cents public.cents not null default 0, currency text not null default 'BRL' check(currency='BRL'),
 archived boolean not null default false, created_at timestamptz not null default now(), unique(workspace_id,id)
);
create table public.categories (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
 name text not null check(length(name) between 1 and 100), archived boolean not null default false,
 unique(workspace_id,id), unique(workspace_id,name)
);
create table public.subcategories (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
 category_id uuid not null, name text not null check(length(name) between 1 and 100),
 unique(workspace_id,id), unique(workspace_id,category_id,id), unique(workspace_id,category_id,name),
 foreign key(workspace_id,category_id) references public.categories(workspace_id,id)
);
create table public.categorization_rules (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
 keyword text not null check(length(keyword) between 1 and 200), priority integer not null default 100,
 category_id uuid not null, subcategory_id uuid, active boolean not null default true,
 foreign key(workspace_id,category_id) references public.categories(workspace_id,id),
 foreign key(workspace_id,category_id,subcategory_id) references public.subcategories(workspace_id,category_id,id), unique(workspace_id,id)
);
create table public.credit_cards (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id), account_id uuid not null,
 closing_day integer not null check(closing_day between 1 and 31), due_day integer not null check(due_day between 1 and 31),
 limit_cents public.cents not null check(limit_cents>=0), last_four text check(last_four ~ '^\d{4}$'),
 foreign key(workspace_id,account_id) references public.financial_accounts(workspace_id,id), unique(workspace_id,id), unique(workspace_id,account_id)
);
create table public.budget_allocations (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id), category_id uuid not null,
 period date not null check(extract(day from period)=1), cadence text not null check(cadence in ('monthly','annual')),
 fixed_cents public.cents check(fixed_cents>=0), percentage_bps integer check(percentage_bps between 0 and 10000),
 forecast_income_cents public.cents check(forecast_income_cents>=0),
 check((fixed_cents is null)<>(percentage_bps is null)), check(cadence<>'annual' or extract(month from period)=1),
 foreign key(workspace_id,category_id) references public.categories(workspace_id,id),
 unique(workspace_id,id), unique(workspace_id,category_id,period,cadence)
);
create table public.savings_goals (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id), account_id uuid not null,
 name text not null check(length(name) between 1 and 100), target_cents public.cents not null check(target_cents>0), deadline date,
 foreign key(workspace_id,account_id) references public.financial_accounts(workspace_id,id), unique(workspace_id,id), unique(workspace_id,account_id)
);
create table public.payslips (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
 competence date not null check(extract(day from competence)=1), employer text not null check(length(employer) between 1 and 100),
 earnings_cents public.cents not null check(earnings_cents>=0), deductions_cents public.cents not null check(deductions_cents>=0),
 advance_cents public.cents not null check(advance_cents>=0), net_cents public.cents not null check(net_cents>=0),
 check(earnings_cents-deductions_cents-advance_cents=net_cents), unique(workspace_id,id)
);
create table public.transactions (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id), account_id uuid not null,
 category_id uuid, subcategory_id uuid, related_id uuid, payslip_id uuid,
 description text not null check(length(description) between 1 and 500), amount_cents public.cents not null check(amount_cents<>0),
 nature text not null check(nature in ('expense','income','transfer','contribution','redemption','card_payment','benefit','loan','refund')),
 event_date date not null, bank_date date not null, competence date not null check(extract(day from competence)=1),
 status text not null default 'approved' check(status in ('approved','void')),
 source text not null default 'manual' check(source in ('manual','file','mock','restore','migration')),
 source_key text not null check(length(source_key) between 1 and 300),
 installment_index integer, installment_count integer,
 created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now(),
 check((nature<>'expense' or amount_cents<0) and (nature not in ('income','benefit','loan','refund') or amount_cents>0)),
 check((installment_index is null and installment_count is null) or (installment_index is not null and installment_count is not null and installment_index between 1 and installment_count and installment_count between 1 and 600)),
 foreign key(workspace_id,account_id) references public.financial_accounts(workspace_id,id),
 foreign key(workspace_id,category_id) references public.categories(workspace_id,id),
 foreign key(workspace_id,category_id,subcategory_id) references public.subcategories(workspace_id,category_id,id),
 foreign key(workspace_id,payslip_id) references public.payslips(workspace_id,id),
 unique(workspace_id,id), unique(workspace_id,account_id,source_key),
 foreign key(workspace_id,related_id) references public.transactions(workspace_id,id) deferrable initially deferred,
 check(subcategory_id is null or category_id is not null)
);
create index transactions_period on public.transactions(workspace_id,competence,status);
create index transactions_cash on public.transactions(workspace_id,account_id,bank_date);
create table public.import_batches (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id), account_id uuid not null,
 file_hash text not null check(length(file_hash) between 1 and 200), parser_version text not null,
 created_at timestamptz not null default now(), created_by uuid not null default auth.uid() references auth.users(id),
 foreign key(workspace_id,account_id) references public.financial_accounts(workspace_id,id),
 unique(workspace_id,id), unique(workspace_id,account_id,file_hash)
);
create table public.import_raw_rows (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id), batch_id uuid not null,
 row_index integer not null check(row_index>=0), proposal jsonb not null,
 status text not null default 'pending' check(status in ('pending','approved','ignored','linked')),
 transaction_id uuid,
 foreign key(workspace_id,batch_id) references public.import_batches(workspace_id,id),
 foreign key(workspace_id,transaction_id) references public.transactions(workspace_id,id),
 unique(workspace_id,id), unique(workspace_id,batch_id,row_index)
);
create table public.review_decisions (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id), row_id uuid not null,
 decision text not null check(decision in ('approve','ignore','link')), transaction_id uuid,
 actor_user_id uuid not null default auth.uid(), created_at timestamptz not null default now(),
 foreign key(workspace_id,row_id) references public.import_raw_rows(workspace_id,id),
 foreign key(workspace_id,transaction_id) references public.transactions(workspace_id,id), unique(workspace_id,id)
);
create table public.source_links (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id), account_id uuid not null,
 transaction_id uuid not null, source_key text not null,
 foreign key(workspace_id,account_id) references public.financial_accounts(workspace_id,id),
 foreign key(workspace_id,transaction_id) references public.transactions(workspace_id,id),
 unique(workspace_id,id), unique(workspace_id,account_id,source_key)
);
create table public.audit_events (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
 entity text not null, entity_id uuid not null, action text not null, actor_user_id uuid default auth.uid(),
 created_at timestamptz not null default now(), unique(workspace_id,id)
);
create function private.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.audit_events(workspace_id,entity,entity_id,action,actor_user_id)
 values(new.workspace_id,tg_table_name,new.id,tg_op,auth.uid()); return new;
end $$;
revoke all on function private.audit_change() from public;
do $$ declare t text; begin
 foreach t in array array['financial_accounts','categories','subcategories','categorization_rules','credit_cards','budget_allocations','savings_goals','payslips','transactions','import_batches','import_raw_rows','review_decisions','source_links','audit_events'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('create policy tenant_read on public.%I for select to authenticated using(public.owns_workspace(workspace_id))',t);
  if t = any(array['financial_accounts','categories','subcategories','categorization_rules','credit_cards','budget_allocations','savings_goals','payslips']) then
   execute format('grant insert,update on public.%I to authenticated',t);
   execute format('create policy tenant_insert on public.%I for insert to authenticated with check(public.owns_workspace(workspace_id))',t);
   execute format('create policy tenant_update on public.%I for update to authenticated using(public.owns_workspace(workspace_id)) with check(public.owns_workspace(workspace_id))',t);
  end if;
  if t <> 'audit_events' then execute format('create trigger audit_change after insert or update on public.%I for each row execute function private.audit_change()',t); end if;
 end loop;
end $$;

create function public.my_workspace() returns uuid language sql stable security invoker set search_path='' as $$
 select id from public.workspaces where owner_id=auth.uid();
$$;
revoke all on function public.my_workspace() from public;
grant execute on function public.my_workspace() to authenticated;

create function public.record_transaction(p jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare w uuid:=public.my_workspace(); t uuid; n text:=p->>'nature'; a uuid:=(p->>'account_id')::uuid; other uuid; v bigint:=(p->>'amount_cents')::bigint; k text:=p->>'source_key';
begin
 if w is null or not public.owns_workspace(w) then raise exception 'Acesso negado'; end if;
 if not exists(select 1 from public.financial_accounts where workspace_id=w and id=a and not archived) then raise exception 'Conta indisponível'; end if;
 if n in ('transfer','contribution','redemption','card_payment') then
   other:=(p->>'counterpart_account_id')::uuid;
   if v>=0 or other=a or not exists(select 1 from public.financial_accounts where workspace_id=w and id=other and not archived) then raise exception 'Informe origem, destino e saída negativa'; end if;
 end if;
 if n='refund' and not exists(select 1 from public.transactions where workspace_id=w and id=(p->>'related_id')::uuid and nature='expense' and status='approved') then raise exception 'Vincule o estorno à compra'; end if;
 if n='income' and exists(select 1 from public.financial_accounts where workspace_id=w and id=a and kind in ('credit','benefit','loan')) then raise exception 'Conta não elegível para renda'; end if;
 if p->>'payslip_id' is not null and n<>'income' then raise exception 'Holerite só vincula receita elegível'; end if;
 if n='benefit' and not exists(select 1 from public.financial_accounts where workspace_id=w and id=a and kind='benefit') then raise exception 'Benefício exige carteira VR/VA'; end if;
 if n='contribution' and not exists(select 1 from public.financial_accounts where workspace_id=w and id=other and kind='savings') then raise exception 'Aporte exige destino de investimento'; end if;
 if n='redemption' and not exists(select 1 from public.financial_accounts where workspace_id=w and id=a and kind='savings') then raise exception 'Resgate exige origem de investimento'; end if;
 if n='card_payment' and not exists(select 1 from public.financial_accounts where workspace_id=w and id=other and kind='credit') then raise exception 'Pagamento exige cartão de destino'; end if;
 insert into public.transactions(workspace_id,account_id,category_id,subcategory_id,related_id,payslip_id,description,amount_cents,nature,event_date,bank_date,competence,source_key,installment_index,installment_count)
 values(w,a,nullif(p->>'category_id','')::uuid,nullif(p->>'subcategory_id','')::uuid,nullif(p->>'related_id','')::uuid,nullif(p->>'payslip_id','')::uuid,p->>'description',v,n,(p->>'event_date')::date,(p->>'bank_date')::date,(p->>'competence')::date,k,(p->>'installment_index')::integer,(p->>'installment_count')::integer)
 on conflict(workspace_id,account_id,source_key) do nothing returning id into t;
 if t is null then select id into t from public.transactions where workspace_id=w and account_id=a and source_key=k; return t; end if;
 if other is not null then
   insert into public.transactions(workspace_id,account_id,description,amount_cents,nature,event_date,bank_date,competence,source_key,related_id)
   values(w,other,p->>'description',-v,n,(p->>'event_date')::date,(p->>'bank_date')::date,(p->>'competence')::date,k||':counterpart',t);
 end if;
 return t;
end $$;
revoke all on function public.record_transaction(jsonb) from public;
grant execute on function public.record_transaction(jsonb) to authenticated;

create function public.void_transaction(target uuid) returns void language plpgsql security definer set search_path='' as $$
declare w uuid:=public.my_workspace();
begin
 if w is null then raise exception 'Acesso negado'; end if;
 if not exists(select 1 from public.transactions where id=target and workspace_id=w) then raise exception 'Movimento indisponível'; end if;
 update public.transactions set status='void' where workspace_id=w and (id=target or related_id=target or id=(select related_id from public.transactions where id=target and workspace_id=w and nature in ('transfer','contribution','redemption','card_payment')));
end $$;
revoke all on function public.void_transaction(uuid) from public;
grant execute on function public.void_transaction(uuid) to authenticated;

create function public.stage_import(account uuid, hash text, parser text, rows jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare w uuid:=public.my_workspace(); b uuid; r jsonb; i integer:=0;
begin
 if w is null or not exists(select 1 from public.financial_accounts where workspace_id=w and id=account) then raise exception 'Acesso negado'; end if;
 if jsonb_typeof(rows)<>'array' or jsonb_array_length(rows)>2000 then raise exception 'Limite de 2000 linhas por lote'; end if;
 insert into public.import_batches(workspace_id,account_id,file_hash,parser_version) values(w,account,hash,parser)
 on conflict(workspace_id,account_id,file_hash) do nothing returning id into b;
 if b is null then select id into b from public.import_batches where workspace_id=w and account_id=account and file_hash=hash; return b; end if;
 for r in select value from jsonb_array_elements(rows) loop
   insert into public.import_raw_rows(workspace_id,batch_id,row_index,proposal) values(w,b,i,r); i:=i+1;
 end loop; return b;
end $$;
revoke all on function public.stage_import(uuid,text,text,jsonb) from public;
grant execute on function public.stage_import(uuid,text,text,jsonb) to authenticated;

create function public.review_import(target uuid, decision text, changes jsonb default '{}'::jsonb, existing uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare w uuid:=public.my_workspace(); r public.import_raw_rows; b public.import_batches; t uuid; p jsonb; k text;
begin
 select * into r from public.import_raw_rows where workspace_id=w and id=target for update;
 if not found then raise exception 'Linha indisponível'; end if;
 if r.status<>'pending' then return r.transaction_id; end if;
 select * into b from public.import_batches where workspace_id=w and id=r.batch_id;
 p:=r.proposal||changes;
 k:=coalesce(nullif(r.proposal->>'external_key',''),'file:'||b.file_hash||':'||r.row_index);
 if decision='approve' then
   select transaction_id into t from public.source_links where workspace_id=w and account_id=b.account_id and source_key=k;
   if t is null then
    t:=public.record_transaction(p||jsonb_build_object('account_id',b.account_id,'source_key',k));
    update public.transactions set source=case when b.parser_version like 'mock%' then 'mock' else 'file' end where workspace_id=w and id=t;
   end if;
 elsif decision='link' then
   if not exists(select 1 from public.transactions where workspace_id=w and id=existing and account_id=b.account_id and status='approved' and amount_cents=(p->>'amount_cents')::bigint) then raise exception 'Vínculo incompatível'; end if;
   t:=existing;
 elsif decision<>'ignore' then raise exception 'Decisão inválida'; end if;
 if t is not null then
  insert into public.source_links(workspace_id,account_id,transaction_id,source_key) values(w,b.account_id,t,k) on conflict(workspace_id,account_id,source_key) do nothing;
 end if;
 update public.import_raw_rows set status=case decision when 'approve' then 'approved' when 'link' then 'linked' else 'ignored' end,transaction_id=t where id=target and workspace_id=w;
 insert into public.review_decisions(workspace_id,row_id,decision,transaction_id) values(w,target,decision,t);
 return t;
end $$;
revoke all on function public.review_import(uuid,text,jsonb,uuid) from public;
grant execute on function public.review_import(uuid,text,jsonb,uuid) to authenticated;

-- Converter centavos em strings evita perda na serialização PostgREST/JavaScript.
create function private.money_json(row_data jsonb) returns jsonb language sql immutable set search_path='' as $$
 select coalesce(jsonb_object_agg(key,case when key like '%\_cents' escape '\' and value<>'null'::jsonb then to_jsonb(value #>> '{}') else value end),'{}'::jsonb) from jsonb_each(row_data);
$$;
revoke all on function private.money_json(jsonb) from public;
create function public.workspace_snapshot() returns jsonb language plpgsql security definer set search_path='' as $$
declare w uuid:=public.my_workspace(); t text; result jsonb; data jsonb;
begin
 if w is null or not public.owns_workspace(w) then raise exception 'Acesso negado'; end if;
 result:=jsonb_build_object('version',1,'workspace_id',w,'exported_at',now());
 foreach t in array array['financial_accounts','categories','subcategories','categorization_rules','credit_cards','budget_allocations','savings_goals','payslips','transactions','import_batches','import_raw_rows','review_decisions','source_links','audit_events'] loop
  execute format('select coalesce(jsonb_agg(private.money_json(to_jsonb(x)) order by id),''[]''::jsonb) from public.%I x where workspace_id=$1',t) into data using w;
  result:=result||jsonb_build_object(t,data);
 end loop;
 return result;
end $$;
revoke all on function public.workspace_snapshot() from public;
grant execute on function public.workspace_snapshot() to authenticated;
