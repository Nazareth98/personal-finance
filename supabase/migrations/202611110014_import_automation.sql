-- A conta do lote é a perna observada no extrato. Regras determinísticas podem
-- completar a classificação e aprovar somente propostas sem ambiguidade.
alter table public.categorization_rules
  add column account_id uuid,
  add column amount_direction text not null default 'any',
  add column transaction_nature text,
  add column counterpart_account_id uuid,
  add column auto_approve boolean not null default false,
  add constraint categorization_rules_amount_direction
    check(amount_direction in ('any','debit','credit')),
  add constraint categorization_rules_transaction_nature
    check(transaction_nature is null or transaction_nature in (
      'expense','income','transfer','contribution','redemption',
      'card_payment','benefit','loan','refund'
    )),
  add constraint categorization_rules_scope_account_fk
    foreign key(workspace_id,account_id)
    references public.financial_accounts(workspace_id,id),
  add constraint categorization_rules_counterpart_account_fk
    foreign key(workspace_id,counterpart_account_id)
    references public.financial_accounts(workspace_id,id),
  add constraint categorization_rules_distinct_accounts
    check(account_id is null or counterpart_account_id is null or account_id<>counterpart_account_id),
  add constraint categorization_rules_automation_complete
    check(not auto_approve or (transaction_nature is not null and not requires_financial_nature_review));
grant insert(account_id,amount_direction,transaction_nature,counterpart_account_id,auto_approve),
  update(account_id,amount_direction,transaction_nature,counterpart_account_id,auto_approve)
  on public.categorization_rules to authenticated;

alter table public.import_raw_rows
  add column review_reason text,
  add column automation_rule_id uuid,
  add constraint import_raw_rows_review_reason
    check(review_reason is null or review_reason in (
      'no_automation_rule','automation_disabled','nature_review_required',
      'missing_category','missing_subcategory','missing_counterpart',
      'possible_duplicate','unsupported_automatic_nature'
    )),
  add constraint import_raw_rows_automation_rule_fk
    foreign key(workspace_id,automation_rule_id)
    references public.categorization_rules(workspace_id,id);

alter table public.review_decisions
  drop constraint review_decisions_decision_check,
  add constraint review_decisions_decision_check
    check(decision in ('approve','ignore','link','auto_approve','auto_link')),
  add column automation_rule_id uuid,
  add column decision_reason text,
  add constraint review_decisions_automation_rule_fk
    foreign key(workspace_id,automation_rule_id)
    references public.categorization_rules(workspace_id,id);

create function private.normalize_import_text(value text) returns text
language sql immutable strict set search_path='' as $$
  select btrim(translate(lower(value),
    'áàâãäéèêëíìîïóòôõöúùûüç',
    'aaaaaeeeeiiiiooooouuuuc'));
$$;
revoke all on function private.normalize_import_text(text) from public;

-- A perna observada pode ser a entrada na conta corrente ou a saída na conta
-- de investimento. A natureza determina os papéis; a ordem das contas não.
create or replace function public.record_transaction(p jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare
  w uuid:=public.my_workspace();
  t uuid;
  counter_id uuid;
  n text:=p->>'nature';
  a uuid:=(p->>'account_id')::uuid;
  other uuid:=(nullif(p->>'counterpart_account_id',''))::uuid;
  v bigint:=(p->>'amount_cents')::bigint;
  k text:=p->>'source_key';
  a_kind text;
  other_kind text;
  current_row public.transactions;
begin
  if w is null or not public.owns_workspace(w) then raise exception 'Acesso negado'; end if;
  select kind into a_kind from public.financial_accounts
    where workspace_id=w and id=a and not archived;
  if a_kind is null then raise exception 'Conta observada indisponível'; end if;

  if n in ('transfer','contribution','redemption','card_payment','loan') then
    select kind into other_kind from public.financial_accounts
      where workspace_id=w and id=other and not archived;
    if other is null or other=a or other_kind is null then
      raise exception 'Informe uma conta de contrapartida diferente';
    end if;
  end if;
  if n='contribution' and not (
    (a_kind='savings' and v>0 and other_kind in ('checking','cash')) or
    (other_kind='savings' and v<0 and a_kind in ('checking','cash'))
  ) then raise exception 'Aporte exige saída de caixa e entrada em investimento'; end if;
  if n='redemption' and not (
    (a_kind='savings' and v<0 and other_kind in ('checking','cash')) or
    (other_kind='savings' and v>0 and a_kind in ('checking','cash'))
  ) then raise exception 'Resgate exige saída de investimento e entrada em caixa'; end if;
  if n='card_payment' and not (
    (a_kind='credit' and v>0 and other_kind in ('checking','cash')) or
    (other_kind='credit' and v<0 and a_kind in ('checking','cash'))
  ) then raise exception 'Pagamento exige saída de caixa e entrada no cartão'; end if;
  if n='loan' and not (
    a_kind in ('checking','cash') and v>0 and other_kind='loan'
  ) then raise exception 'Crédito de empréstimo exige entrada em caixa e passivo'; end if;
  if n='refund' and not exists(
    select 1 from public.transactions where workspace_id=w
      and id=(p->>'related_id')::uuid and nature='expense' and status='approved'
  ) then raise exception 'Vincule o estorno à compra'; end if;
  if n<>'refund' and nullif(p->>'related_id','') is not null then
    raise exception 'Vínculo direto reservado a estorno';
  end if;
  if n='income' and a_kind in ('credit','benefit','loan') then
    raise exception 'Conta não elegível para renda';
  end if;
  if p->>'payslip_id' is not null and n<>'income' then
    raise exception 'Holerite só vincula receita elegível';
  end if;
  if n='benefit' and a_kind<>'benefit' then
    raise exception 'Benefício exige carteira VR/VA';
  end if;

  insert into public.transactions(
    workspace_id,account_id,category_id,subcategory_id,related_id,payslip_id,
    description,amount_cents,nature,event_date,bank_date,competence,source_key,
    installment_index,installment_count
  ) values(
    w,a,nullif(p->>'category_id','')::uuid,nullif(p->>'subcategory_id','')::uuid,
    nullif(p->>'related_id','')::uuid,nullif(p->>'payslip_id','')::uuid,
    p->>'description',v,n,(p->>'event_date')::date,(p->>'bank_date')::date,
    (p->>'competence')::date,k,(p->>'installment_index')::integer,
    (p->>'installment_count')::integer
  ) on conflict(workspace_id,account_id,source_key) do nothing returning id into t;

  if t is null then
    select * into current_row from public.transactions
      where workspace_id=w and account_id=a and source_key=k;
    if current_row.amount_cents<>v or current_row.description<>p->>'description'
      or current_row.nature<>n or current_row.event_date<>(p->>'event_date')::date
      or current_row.bank_date<>(p->>'bank_date')::date
      or current_row.competence<>(p->>'competence')::date then
      raise exception 'Chave de origem reutilizada com conteúdo diferente';
    end if;
    t:=current_row.id;
  end if;

  if other is not null then
    insert into public.transactions(
      workspace_id,account_id,description,amount_cents,nature,event_date,
      bank_date,competence,source_key,related_id
    ) values(
      w,other,p->>'description',-v,n,(p->>'event_date')::date,
      (p->>'bank_date')::date,(p->>'competence')::date,k||':counterpart',t
    ) on conflict(workspace_id,account_id,source_key) do nothing returning id into counter_id;
    if counter_id is null and not exists(
      select 1 from public.transactions where workspace_id=w and account_id=other
        and source_key=k||':counterpart' and related_id=t and amount_cents=-v
        and nature=n
    ) then raise exception 'Conflito na conta de contrapartida'; end if;
  end if;
  return t;
end $$;
revoke all on function public.record_transaction(jsonb) from public;
grant execute on function public.record_transaction(jsonb) to authenticated;

create or replace function public.review_import(
  target uuid,
  decision text,
  changes jsonb default '{}'::jsonb,
  existing uuid default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare
  w uuid:=public.my_workspace();
  r public.import_raw_rows;
  b public.import_batches;
  t uuid;
  p jsonb;
  k text;
  rule_id uuid:=(nullif(changes->>'automation_rule_id',''))::uuid;
begin
  select * into r from public.import_raw_rows where workspace_id=w and id=target for update;
  if not found then raise exception 'Linha indisponível'; end if;
  if r.status<>'pending' then return r.transaction_id; end if;
  select * into b from public.import_batches where workspace_id=w and id=r.batch_id;
  p:=r.proposal||changes;
  k:=coalesce(nullif(r.proposal->>'external_key',''),'file:'||b.file_hash||':'||r.row_index);
  if decision in ('approve','auto_approve') then
    select transaction_id into t from public.source_links
      where workspace_id=w and account_id=b.account_id and source_key=k;
    if t is null then
      t:=public.record_transaction(p||jsonb_build_object('account_id',b.account_id,'source_key',k));
      update public.transactions set source=case
        when b.parser_version='meupluggy-v1' then 'file'
        when b.parser_version like 'mock%' then 'mock'
        else 'file' end
      where workspace_id=w and (id=t or related_id=t);
    end if;
  elsif decision in ('link','auto_link') then
    if not exists(
      select 1 from public.transactions where workspace_id=w and id=existing
        and account_id=b.account_id and status='approved'
        and amount_cents=(p->>'amount_cents')::bigint
    ) then raise exception 'Vínculo incompatível'; end if;
    t:=existing;
  elsif decision<>'ignore' then raise exception 'Decisão inválida'; end if;
  if t is not null then
    insert into public.source_links(workspace_id,account_id,transaction_id,source_key)
      values(w,b.account_id,t,k)
      on conflict(workspace_id,account_id,source_key) do nothing;
  end if;
  update public.import_raw_rows set
    status=case when decision in ('approve','auto_approve') then 'approved'
      when decision in ('link','auto_link') then 'linked' else 'ignored' end,
    transaction_id=t,review_reason=null,automation_rule_id=coalesce(rule_id,automation_rule_id)
    where id=target and workspace_id=w;
  insert into public.review_decisions(
    workspace_id,row_id,decision,transaction_id,automation_rule_id,decision_reason
  ) values(
    w,target,decision,t,rule_id,
    case when decision='auto_link' then 'strong_source_key'
      when decision='auto_approve' then 'complete_rule' else null end
  );
  return t;
end $$;
revoke all on function public.review_import(uuid,text,jsonb,uuid) from public;
grant execute on function public.review_import(uuid,text,jsonb,uuid) to authenticated;

create function public.process_imports(target_batch uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  w uuid:=public.my_workspace();
  r public.import_raw_rows;
  b public.import_batches;
  matched_rule public.categorization_rules;
  p jsonb;
  k text;
  existing uuid;
  reason text;
  approved_count integer:=0;
  linked_count integer:=0;
  pending_count integer:=0;
begin
  if w is null then raise exception 'Acesso negado'; end if;
  if target_batch is not null and not exists(
    select 1 from public.import_batches where workspace_id=w and id=target_batch
  ) then raise exception 'Lote indisponível'; end if;

  for r in
    select rr.* from public.import_raw_rows rr
    join public.import_batches ib on ib.workspace_id=rr.workspace_id and ib.id=rr.batch_id
    where rr.workspace_id=w and rr.status='pending'
      and (target_batch is null or rr.batch_id=target_batch)
    order by ib.created_at,ib.id,rr.row_index
    for update of rr
  loop
    select * into b from public.import_batches where workspace_id=w and id=r.batch_id;
    p:=r.proposal;
    k:=coalesce(nullif(p->>'external_key',''),'file:'||b.file_hash||':'||r.row_index);
    existing:=null;
    select transaction_id into existing from public.source_links
      where workspace_id=w and account_id=b.account_id and source_key=k;
    if existing is not null then
      perform public.review_import(r.id,'auto_link','{}'::jsonb,existing);
      linked_count:=linked_count+1;
      continue;
    end if;

    reason:=null;
    if exists(
      select 1 from public.transactions t where t.workspace_id=w
        and t.account_id=b.account_id and t.status='approved'
        and t.amount_cents=(p->>'amount_cents')::bigint
        and t.event_date=(p->>'event_date')::date
    ) or exists(
      select 1 from public.import_raw_rows prior
      join public.import_batches pb on pb.workspace_id=prior.workspace_id and pb.id=prior.batch_id
      where prior.workspace_id=w and prior.id<>r.id and prior.status='pending'
        and pb.account_id=b.account_id
        and ((pb.created_at,pb.id)<(b.created_at,b.id)
          or prior.batch_id=r.batch_id and prior.row_index<r.row_index)
        and (prior.proposal->>'amount_cents')::bigint=(p->>'amount_cents')::bigint
        and (prior.proposal->>'event_date')::date=(p->>'event_date')::date
    ) then reason:='possible_duplicate'; end if;

    matched_rule:=null;
    select cr.* into matched_rule from public.categorization_rules cr
      where cr.workspace_id=w and cr.active
        and (cr.account_id is null or cr.account_id=b.account_id)
        and (cr.amount_direction='any'
          or cr.amount_direction='debit' and (p->>'amount_cents')::bigint<0
          or cr.amount_direction='credit' and (p->>'amount_cents')::bigint>0)
        and position(private.normalize_import_text(cr.keyword)
          in private.normalize_import_text(p->>'description'))>0
      order by cr.priority,length(cr.keyword) desc,cr.id limit 1;

    if reason is null and matched_rule.id is null then reason:='no_automation_rule'; end if;
    if reason is null and matched_rule.requires_financial_nature_review then
      reason:='nature_review_required';
    end if;
    if reason is null and not matched_rule.auto_approve then reason:='automation_disabled'; end if;
    if reason is null and matched_rule.transaction_nature is null then
      reason:='nature_review_required';
    end if;

    if matched_rule.id is not null then
      p:=jsonb_strip_nulls(p||jsonb_build_object(
        'category_id',matched_rule.category_id,
        'subcategory_id',matched_rule.subcategory_id,
        'nature',matched_rule.transaction_nature,
        'counterpart_account_id',matched_rule.counterpart_account_id,
        'automation_rule_id',matched_rule.id
      ));
    end if;
    if reason is null and p->>'nature' in ('expense','income','benefit')
      and nullif(p->>'category_id','') is null then reason:='missing_category'; end if;
    if reason is null and p->>'nature' in ('expense','income','benefit')
      and nullif(p->>'subcategory_id','') is null then reason:='missing_subcategory'; end if;
    if reason is null and p->>'nature' in (
      'transfer','contribution','redemption','card_payment','loan'
    ) and nullif(p->>'counterpart_account_id','') is null then
      reason:='missing_counterpart';
    end if;
    if reason is null and p->>'nature'='refund' then
      reason:='unsupported_automatic_nature';
    end if;

    if reason is null then
      perform public.review_import(r.id,'auto_approve',p,null);
      approved_count:=approved_count+1;
    else
      update public.import_raw_rows set review_reason=reason,
        automation_rule_id=matched_rule.id where workspace_id=w and id=r.id;
      pending_count:=pending_count+1;
    end if;
  end loop;
  return jsonb_build_object(
    'approved',approved_count,'linked',linked_count,'pending',pending_count
  );
end $$;
revoke all on function public.process_imports(uuid) from public,anon;
grant execute on function public.process_imports(uuid) to authenticated;
