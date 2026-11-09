create table public.billing_statements (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id),account_id uuid not null,
 competence date not null check(extract(day from competence)=1),due_date date not null,declared_cents public.cents not null check(declared_cents>=0),
 unique(workspace_id,id),unique(workspace_id,account_id,competence),foreign key(workspace_id,account_id) references public.financial_accounts(workspace_id,id)
);
create table public.billing_payments (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id),statement_id uuid not null,transaction_id uuid not null,
 unique(workspace_id,id),unique(workspace_id,transaction_id),foreign key(workspace_id,statement_id) references public.billing_statements(workspace_id,id),foreign key(workspace_id,transaction_id) references public.transactions(workspace_id,id)
);
create table public.installment_purchases (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id),account_id uuid not null,category_id uuid,
 description text not null check(length(description) between 1 and 500),event_date date not null,first_competence date not null check(extract(day from first_competence)=1),
 total_cents public.cents not null check(total_cents>0),installments integer not null check(installments between 2 and 600),
 unique(workspace_id,id),foreign key(workspace_id,account_id) references public.financial_accounts(workspace_id,id),foreign key(workspace_id,category_id) references public.categories(workspace_id,id)
);
create table public.installment_occurrences (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id),purchase_id uuid not null,
 occurrence integer not null check(occurrence>0),competence date not null check(extract(day from competence)=1),amount_cents public.cents not null check(amount_cents>0),transaction_id uuid,
 unique(workspace_id,id),unique(workspace_id,purchase_id,occurrence),unique(workspace_id,transaction_id),
 foreign key(workspace_id,purchase_id) references public.installment_purchases(workspace_id,id),foreign key(workspace_id,transaction_id) references public.transactions(workspace_id,id)
);
create table public.payslip_items (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id),payslip_id uuid not null,
 code text not null,description text not null,kind text not null check(kind in ('earning','deduction','advance')),amount_cents public.cents not null check(amount_cents>=0),
 unique(workspace_id,id),foreign key(workspace_id,payslip_id) references public.payslips(workspace_id,id)
);
create table public.payslip_bases (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id),payslip_id uuid not null,
 name text not null,amount_cents public.cents not null check(amount_cents>=0),unique(workspace_id,id),foreign key(workspace_id,payslip_id) references public.payslips(workspace_id,id)
);
create table public.transaction_classifications (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id),transaction_id uuid not null,
 previous_category_id uuid,new_category_id uuid,previous_subcategory_id uuid,new_subcategory_id uuid,
 actor_user_id uuid not null default auth.uid(),created_at timestamptz not null default now(),unique(workspace_id,id),
 foreign key(workspace_id,transaction_id) references public.transactions(workspace_id,id),
 foreign key(workspace_id,previous_category_id) references public.categories(workspace_id,id),foreign key(workspace_id,new_category_id) references public.categories(workspace_id,id),
 foreign key(workspace_id,previous_category_id,previous_subcategory_id) references public.subcategories(workspace_id,category_id,id),foreign key(workspace_id,new_category_id,new_subcategory_id) references public.subcategories(workspace_id,category_id,id)
);
do $$ declare t text;cols text;begin
 foreach t in array array['billing_statements','billing_payments','installment_purchases','installment_occurrences','payslip_items','payslip_bases','transaction_classifications'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('create policy tenant_read on public.%I for select to authenticated using(public.owns_workspace(workspace_id))',t);
 if t=any(array['billing_statements','payslip_items','payslip_bases']) then
 select string_agg(quote_ident(column_name),',' order by ordinal_position) into cols from information_schema.columns where table_schema='public' and table_name=t and column_name<>'id';
 execute format('grant insert(%s) on public.%I to authenticated',cols,t);
 execute format('create policy tenant_insert on public.%I for insert to authenticated with check(public.owns_workspace(workspace_id))',t);
 end if;
 execute format('create trigger audit_change after insert or update on public.%I for each row execute function private.audit_change()',t);
 end loop;
end $$;
create function public.reclassify_transaction(target uuid, category uuid, subcategory uuid default null) returns void language plpgsql security definer set search_path='' as $$
declare w uuid:=public.my_workspace();t public.transactions;
begin
 select * into t from public.transactions where id=target and workspace_id=w and status='approved' for update;
 if not found then raise exception 'Movimento indisponível';end if;
 insert into public.transaction_classifications(workspace_id,transaction_id,previous_category_id,new_category_id,previous_subcategory_id,new_subcategory_id) values(w,target,t.category_id,category,t.subcategory_id,subcategory);
 update public.transactions set category_id=category,subcategory_id=subcategory where workspace_id=w and id=target;
end $$;
create function public.plan_installments(p jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare w uuid:=public.my_workspace();purchase_id uuid;n integer:=(p->>'installments')::integer;total bigint:=(p->>'total_cents')::bigint;i integer;
begin
 if w is null or not exists(select 1 from public.financial_accounts where workspace_id=w and id=(p->>'account_id')::uuid and kind='credit') then raise exception 'Informe um cartão próprio';end if;
 if n not between 2 and 600 or total<n then raise exception 'Parcelamento inválido';end if;
 insert into public.installment_purchases(workspace_id,account_id,category_id,description,event_date,first_competence,total_cents,installments)
 values(w,(p->>'account_id')::uuid,nullif(p->>'category_id','')::uuid,p->>'description',(p->>'event_date')::date,(p->>'first_competence')::date,total,n) returning installment_purchases.id into purchase_id;
 for i in 1..n loop
 insert into public.installment_occurrences(workspace_id,purchase_id,occurrence,competence,amount_cents) values(w,purchase_id,i,((p->>'first_competence')::date+(i-1)*interval '1 month')::date,total/n+case when i<=total%n then 1 else 0 end);
 end loop;return purchase_id;
end $$;
create function public.confirm_installment(target uuid, existing uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare w uuid:=public.my_workspace();o public.installment_occurrences;p public.installment_purchases;t uuid;
begin
 select * into o from public.installment_occurrences where workspace_id=w and id=target for update;
 if not found then raise exception 'Parcela indisponível';end if;
 if o.transaction_id is not null then return o.transaction_id;end if;
 select * into p from public.installment_purchases where workspace_id=w and id=o.purchase_id;
 if existing is not null then
 if not exists(select 1 from public.transactions where workspace_id=w and id=existing and account_id=p.account_id and amount_cents=-o.amount_cents and competence=o.competence and nature='expense' and status='approved') then raise exception 'Movimento incompatível';end if;t:=existing;
 else
 t:=public.record_transaction(jsonb_build_object('account_id',p.account_id,'category_id',p.category_id,'description',p.description,'amount_cents',(-o.amount_cents)::text,'nature','expense','event_date',p.event_date,'bank_date',p.event_date,'competence',o.competence,'installment_index',o.occurrence,'installment_count',p.installments,'source_key','installment:'||o.id));
 end if;
 update public.installment_occurrences set transaction_id=t where workspace_id=w and id=target;return t;
end $$;
create function public.pay_statement(statement uuid, source_account uuid, payment_date date, amount text, request_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare w uuid:=public.my_workspace();s public.billing_statements;t uuid;
begin
 select * into s from public.billing_statements where workspace_id=w and id=statement for update;
 if not found or amount::bigint<=0 then raise exception 'Fatura indisponível';end if;
 t:=public.record_transaction(jsonb_build_object('account_id',source_account,'counterpart_account_id',s.account_id,'description','Pagamento de fatura','nature','card_payment','amount_cents',(-amount::bigint)::text,'event_date',payment_date,'bank_date',payment_date,'competence',date_trunc('month',payment_date)::date,'source_key','statement:'||statement||':'||request_id));
 insert into public.billing_payments(workspace_id,statement_id,transaction_id) values(w,statement,t) on conflict(workspace_id,transaction_id) do nothing;return t;
end $$;
revoke all on function public.reclassify_transaction(uuid,uuid,uuid),public.plan_installments(jsonb),public.confirm_installment(uuid,uuid),public.pay_statement(uuid,uuid,date,text,uuid) from public;
grant execute on function public.reclassify_transaction(uuid,uuid,uuid),public.plan_installments(jsonb),public.confirm_installment(uuid,uuid),public.pay_statement(uuid,uuid,date,text,uuid) to authenticated;

alter function public.workspace_snapshot() rename to snapshot_before_details;
revoke all on function public.snapshot_before_details() from public,authenticated;
create function public.workspace_snapshot() returns jsonb language plpgsql security definer set search_path='' as $$
declare w uuid:=public.my_workspace();result jsonb;t text;data jsonb;
begin
 if w is null then raise exception 'Acesso negado';end if;result:=public.snapshot_before_details();
 foreach t in array array['billing_statements','billing_payments','installment_purchases','installment_occurrences','payslip_items','payslip_bases','transaction_classifications'] loop
 execute format('select coalesce(jsonb_agg(private.money_json(to_jsonb(x)) order by id),''[]''::jsonb) from public.%I x where workspace_id=$1',t) into data using w;result:=result||jsonb_build_object(t,data);
 end loop;return result;
end $$;
revoke all on function public.workspace_snapshot() from public;grant execute on function public.workspace_snapshot() to authenticated;
alter function public.restore_backup(jsonb,boolean) rename to restore_before_details;
revoke all on function public.restore_before_details(jsonb,boolean) from public,authenticated;
create function public.restore_backup(backup jsonb,confirmed boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare w uuid:=public.my_workspace();result jsonb;t text;r jsonb;normalized jsonb;existing jsonb;total integer:=0;added integer:=0;
begin
 result:=public.restore_before_details(backup,confirmed);
 foreach t in array array['billing_statements','billing_payments','installment_purchases','installment_occurrences','payslip_items','payslip_bases','transaction_classifications'] loop
 if jsonb_typeof(coalesce(backup->t,'[]'::jsonb))<>'array' then raise exception 'Backup inválido';end if;
 for r in select value from jsonb_array_elements(coalesce(backup->t,'[]'::jsonb)) loop
 total:=total+1;if total>50000 then raise exception 'Limite excedido';end if;
 if (r->>'workspace_id')::uuid is distinct from w or r->>'id' is null then raise exception 'Registro de outro workspace';end if;
 if r ? 'actor_user_id' and (r->>'actor_user_id')::uuid is distinct from auth.uid() then raise exception 'Ator incompatível';end if;
 execute format('select private.money_json(to_jsonb(jsonb_populate_record(null::public.%I,$1)))',t) into normalized using r;
 execute format('select private.money_json(to_jsonb(x)) from public.%I x where workspace_id=$1 and id=$2',t) into existing using w,(r->>'id')::uuid;
 if existing is not null then if existing<>normalized then raise exception 'Conflito com registro existente';end if;
 else added:=added+1;if confirmed then execute format('insert into public.%I select * from jsonb_populate_record(null::public.%I,$1)',t,t) using normalized;end if;end if;
 end loop;end loop;
 return result||jsonb_build_object('total',(result->>'total')::int+total,'new',(result->>'new')::int+added,'existing',(result->>'existing')::int+total-added);
end $$;
revoke all on function public.restore_backup(jsonb,boolean) from public;grant execute on function public.restore_backup(jsonb,boolean) to authenticated;
