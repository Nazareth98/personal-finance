begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

lock table public.transactions in access exclusive mode;
alter table public.transactions disable trigger transactions_keep_imported_immutable;

do $$
declare
  owner uuid;
  aliases_before bigint;
  categories_before bigint;
  profiles_before bigint;
  auth_users_before bigint;
begin
  if (select count(*) from public.profiles where is_owner) <> 1 then
    raise exception 'Development reset requires exactly one owner profile';
  end if;

  select id into owner from public.profiles where is_owner;
  select count(*) into profiles_before from public.profiles;
  select count(*) into auth_users_before from auth.users;
  select count(*) into categories_before from public.categories;
  select count(*) into aliases_before
  from public.classification_rules
  where owner_id = owner and evidence_type = 'alias';

  if profiles_before <> 1 or auth_users_before <> 1
    or not exists (select 1 from auth.users where id = owner) then
    raise exception 'Development reset requires one matching Auth user and profile';
  end if;

  delete from public.transaction_semantic_overrides where owner_id = owner;
  delete from public.classification_feedback where owner_id = owner;
  delete from public.transaction_classifications where owner_id = owner;
  delete from public.card_installments where owner_id = owner;
  delete from public.card_statement_entries where owner_id = owner;
  delete from public.savings_movements where owner_id = owner;
  delete from public.transaction_links where owner_id = owner;
  delete from public.category_budgets where owner_id = owner;
  delete from public.card_statements where owner_id = owner;
  delete from public.savings_boxes where owner_id = owner;
  delete from private.pluggy_transactions where owner_id = owner;
  delete from private.pluggy_accounts where owner_id = owner;
  delete from public.credit_cards where owner_id = owner;
  delete from public.transactions where owner_id = owner;
  delete from public.sync_runs where owner_id = owner;
  delete from private.webhook_events event
  where event.item_id in (
    select connection.item_id
    from public.pluggy_connections connection
    where connection.owner_id = owner
  );
  delete from public.pluggy_connections where owner_id = owner;
  delete from public.financial_accounts where owner_id = owner;
  delete from public.classification_rules where owner_id = owner and evidence_type <> 'alias';

  if (select count(*) from public.profiles) <> profiles_before
    or (select count(*) from auth.users) <> auth_users_before
    or (select count(*) from public.categories) <> categories_before
    or (select count(*) from public.classification_rules
        where owner_id = owner and evidence_type = 'alias') <> aliases_before then
    raise exception 'Protected Auth, profile, category or alias data changed';
  end if;

  if exists (
    select 1 from public.transaction_semantic_overrides where owner_id = owner
    union all select 1 from public.classification_feedback where owner_id = owner
    union all select 1 from public.transaction_classifications where owner_id = owner
    union all select 1 from public.card_installments where owner_id = owner
    union all select 1 from public.card_statement_entries where owner_id = owner
    union all select 1 from public.savings_movements where owner_id = owner
    union all select 1 from public.transaction_links where owner_id = owner
    union all select 1 from public.category_budgets where owner_id = owner
    union all select 1 from public.card_statements where owner_id = owner
    union all select 1 from public.savings_boxes where owner_id = owner
    union all select 1 from private.pluggy_transactions where owner_id = owner
    union all select 1 from private.pluggy_accounts where owner_id = owner
    union all select 1 from public.credit_cards where owner_id = owner
    union all select 1 from public.transactions where owner_id = owner
    union all select 1 from public.sync_runs where owner_id = owner
    union all select 1 from private.webhook_events event
      where event.item_id in (
        select connection.item_id from public.pluggy_connections connection where connection.owner_id = owner
      )
    union all select 1 from public.pluggy_connections where owner_id = owner
    union all select 1 from public.financial_accounts where owner_id = owner
    union all select 1 from public.classification_rules where owner_id = owner and evidence_type <> 'alias'
  ) then
    raise exception 'Development reset left derived data behind';
  end if;
end;
$$;

alter table public.transactions enable trigger transactions_keep_imported_immutable;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.transactions'::regclass
      and tgname = 'transactions_keep_imported_immutable'
      and tgenabled = 'O'
  ) then
    raise exception 'Imported transaction immutability trigger was not restored';
  end if;
end;
$$;

commit;
