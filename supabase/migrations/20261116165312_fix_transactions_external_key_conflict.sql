drop index public.transactions_external_key;

alter table public.transactions
  add constraint transactions_owner_external_key_key unique (owner_id, external_key);
