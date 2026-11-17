create or replace function public.confirm_transaction_classification(p_transaction_id uuid, p_category_id text) returns void
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare
  current_owner uuid := auth.uid();
  transaction_row public.transactions%rowtype;
  effective_nature text;
  previous_category text;
  normalized text;
  learned_rule_id uuid;
begin
  if current_owner is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.categories where id = p_category_id) then raise exception 'Category not available'; end if;
  select * into transaction_row from public.transactions
  where id = p_transaction_id and owner_id = current_owner and source = 'pluggy';
  if transaction_row.id is null then raise exception 'Imported transaction not available'; end if;
  select coalesce(semantic.effective_nature, transaction_row.nature) into effective_nature
  from (select 1) seed
  left join public.transaction_semantic_overrides semantic
    on semantic.transaction_id = transaction_row.id and semantic.owner_id = current_owner;
  if effective_nature not in ('income', 'expense') then raise exception 'Effective transaction nature cannot be categorized'; end if;

  normalized := private.normalize_classification_text(transaction_row.description);
  if normalized = '' then raise exception 'Description cannot produce an alias'; end if;
  select coalesce(tc.category_id, transaction_row.category_id) into previous_category
  from (select 1) seed
  left join public.transaction_classifications tc on tc.transaction_id = transaction_row.id;

  insert into public.classification_feedback (
    owner_id, transaction_id, previous_category_id, confirmed_category_id, normalized_description
  ) values (current_owner, transaction_row.id, previous_category, p_category_id, normalized);

  insert into public.classification_rules (
    owner_id, category_id, evidence_type, pattern, weight_basis_points, source
  ) values (current_owner, p_category_id, 'alias', normalized, 9000, 'feedback')
  on conflict (owner_id, evidence_type, pattern) do update set
    category_id = excluded.category_id,
    weight_basis_points = excluded.weight_basis_points,
    source = 'feedback',
    enabled = true,
    updated_at = now()
  returning id into learned_rule_id;

  insert into public.transaction_classifications (
    owner_id, transaction_id, category_id, confidence_basis_points, status, classifier_version, explanation
  ) values (
    current_owner, transaction_row.id, p_category_id, 10000, 'confirmed', 'rules-v1',
    jsonb_build_object('evidence', jsonb_build_array(jsonb_build_object(
      'ruleId', learned_rule_id, 'kind', 'alias', 'value', normalized,
      'weightBasisPoints', 10000, 'label', 'Correção confirmada'
    )))
  )
  on conflict (transaction_id) do update set
    category_id = excluded.category_id,
    confidence_basis_points = 10000,
    status = 'confirmed',
    classifier_version = excluded.classifier_version,
    explanation = excluded.explanation,
    updated_at = now();

  insert into public.transaction_classifications (
    owner_id, transaction_id, category_id, confidence_basis_points, status, classifier_version, explanation
  )
  select
    current_owner, candidate.id, p_category_id, 9000, 'automatic', 'rules-v1',
    jsonb_build_object('evidence', jsonb_build_array(jsonb_build_object(
      'ruleId', learned_rule_id, 'kind', 'alias', 'value', normalized,
      'weightBasisPoints', 9000, 'label', 'Alias aprendido de correção confirmada'
    )))
  from public.transactions candidate
  left join public.transaction_semantic_overrides candidate_semantic
    on candidate_semantic.transaction_id = candidate.id and candidate_semantic.owner_id = current_owner
  where candidate.owner_id = current_owner
    and candidate.source = 'pluggy'
    and coalesce(candidate_semantic.effective_nature, candidate.nature) in ('income', 'expense')
    and candidate.id <> transaction_row.id
    and private.normalize_classification_text(candidate.description) = normalized
  on conflict (transaction_id) do update set
    category_id = excluded.category_id,
    confidence_basis_points = excluded.confidence_basis_points,
    status = excluded.status,
    classifier_version = excluded.classifier_version,
    explanation = excluded.explanation,
    updated_at = now()
  where public.transaction_classifications.status <> 'confirmed';
end;
$$;

revoke all on function public.confirm_transaction_classification(uuid, text) from public, anon;
grant execute on function public.confirm_transaction_classification(uuid, text) to authenticated;
