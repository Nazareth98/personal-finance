-- Conservar o contrato público enquanto endurecemos idempotência e passivos.
alter table public.transactions drop constraint transactions_check;
alter table public.transactions add constraint transaction_direction check(
 (nature<>'expense' or amount_cents<0) and (nature not in ('income','benefit','refund') or amount_cents>0)
);
alter table public.transactions add unique(workspace_id,account_id,id);
alter table public.source_links add foreign key(workspace_id,account_id,transaction_id) references public.transactions(workspace_id,account_id,id);
alter function public.record_transaction(jsonb) rename to record_financial_event;
revoke all on function public.record_financial_event(jsonb) from public,authenticated;
create function public.record_transaction(p jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare w uuid:=public.my_workspace();t uuid;r public.transactions;debt uuid;counter_id uuid;
begin
 if w is null then raise exception 'Acesso negado';end if;
 if p->>'nature'<>'refund' and nullif(p->>'related_id','') is not null then raise exception 'Vínculo direto reservado a estorno';end if;
 if p->>'nature'='loan' then
 debt:=(p->>'counterpart_account_id')::uuid;
 if (p->>'amount_cents')::bigint<=0 or not exists(select 1 from public.financial_accounts where workspace_id=w and id=debt and kind='loan') or not exists(select 1 from public.financial_accounts where workspace_id=w and id=(p->>'account_id')::uuid and kind in ('checking','cash')) then raise exception 'Crédito de empréstimo exige conta de caixa e passivo';end if;
 end if;
 t:=public.record_financial_event(p);
 select * into r from public.transactions where workspace_id=w and id=t;
 if r.amount_cents<>(p->>'amount_cents')::bigint or r.description<>p->>'description' or r.nature<>p->>'nature' or r.event_date<>(p->>'event_date')::date or r.bank_date<>(p->>'bank_date')::date or r.competence<>(p->>'competence')::date then raise exception 'Chave de origem reutilizada com conteúdo diferente';end if;
 if debt is not null then
 insert into public.transactions(workspace_id,account_id,description,amount_cents,nature,event_date,bank_date,competence,source_key,related_id)
 values(w,debt,r.description,-r.amount_cents,'loan',r.event_date,r.bank_date,r.competence,r.source_key||':liability',t)
 on conflict(workspace_id,account_id,source_key) do nothing returning id into counter_id;
 if counter_id is null and not exists(select 1 from public.transactions where workspace_id=w and account_id=debt and source_key=r.source_key||':liability' and related_id=t and amount_cents=-r.amount_cents) then raise exception 'Conflito no passivo';end if;
 end if;return t;
end $$;

create unique index one_counterpart_per_event on public.transactions(workspace_id,related_id) where related_id is not null and nature in ('transfer','contribution','redemption','card_payment','loan');
create function private.validate_double_entry() returns trigger language plpgsql security definer set search_path='' as $$
declare current_row public.transactions;
begin
 select * into current_row from public.transactions where id=new.id and workspace_id=new.workspace_id;
 if current_row.nature in ('transfer','contribution','redemption','card_payment','loan') and not exists(
  select 1 from public.transactions b where b.workspace_id=current_row.workspace_id and b.account_id<>current_row.account_id and b.amount_cents=-current_row.amount_cents and b.nature=current_row.nature and b.status=current_row.status and (b.related_id=current_row.id or current_row.related_id=b.id)
 ) then raise exception 'Movimento patrimonial exige par consistente';end if;return new;
end $$;
revoke all on function private.validate_double_entry() from public;
create constraint trigger validate_double_entry after insert or update on public.transactions deferrable initially deferred for each row execute function private.validate_double_entry();
revoke all on function public.record_transaction(jsonb) from public;grant execute on function public.record_transaction(jsonb) to authenticated;

create function private.validate_financial_details() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='billing_statements' then
  if not exists(select 1 from public.financial_accounts where workspace_id=new.workspace_id and id=new.account_id and kind='credit') then raise exception 'Fatura exige conta de cartão';end if;
 elsif tg_table_name='billing_payments' then
  if not exists(select 1 from public.transactions t join public.billing_statements s on s.workspace_id=t.workspace_id and s.id=new.statement_id where t.workspace_id=new.workspace_id and t.id=new.transaction_id and t.nature='card_payment' and t.amount_cents<0 and exists(select 1 from public.transactions c where c.workspace_id=t.workspace_id and c.related_id=t.id and c.account_id=s.account_id and c.amount_cents=-t.amount_cents)) then raise exception 'Pagamento incompatível com a fatura';end if;
 elsif tg_table_name='installment_occurrences' and new.transaction_id is not null then
  if not exists(select 1 from public.transactions t join public.installment_purchases p on p.workspace_id=t.workspace_id and p.id=new.purchase_id where t.workspace_id=new.workspace_id and t.id=new.transaction_id and t.account_id=p.account_id and t.amount_cents=-new.amount_cents and t.competence=new.competence and t.nature='expense') then raise exception 'Parcela incompatível';end if;
 end if;return new;
end $$;
revoke all on function private.validate_financial_details() from public;
create trigger validate_details before insert or update on public.billing_statements for each row execute function private.validate_financial_details();
create trigger validate_details before insert or update on public.billing_payments for each row execute function private.validate_financial_details();
create trigger validate_details before insert or update on public.installment_occurrences for each row execute function private.validate_financial_details();

create or replace function public.void_transaction(target uuid) returns void language plpgsql security definer set search_path='' as $$
declare w uuid:=public.my_workspace();
begin
 if w is null then raise exception 'Acesso negado';end if;
 if not exists(select 1 from public.transactions where id=target and workspace_id=w) then raise exception 'Movimento indisponível';end if;
 update public.transactions set status='void' where workspace_id=w and (id=target or related_id=target or id=(select related_id from public.transactions where id=target and workspace_id=w and nature in ('transfer','contribution','redemption','card_payment','loan')));
end $$;
