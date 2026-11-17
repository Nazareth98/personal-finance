create index semantic_overrides_transaction_owner
  on public.transaction_semantic_overrides (transaction_id, owner_id);
create index semantic_overrides_counterpart_owner
  on public.transaction_semantic_overrides (counterpart_transaction_id, owner_id)
  where counterpart_transaction_id is not null;
create index semantic_overrides_statement_owner
  on public.transaction_semantic_overrides (statement_id, owner_id)
  where statement_id is not null;
create index semantic_overrides_savings_box_owner
  on public.transaction_semantic_overrides (savings_box_id, owner_id)
  where savings_box_id is not null;
