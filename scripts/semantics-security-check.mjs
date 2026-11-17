import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile('supabase/migrations/20261116185031_transaction_semantic_overrides.sql', 'utf8');
const indexes = await readFile('supabase/migrations/20261117104611_index_transaction_semantic_overrides.sql', 'utf8');
const effectiveClassification = await readFile('supabase/migrations/20261117110113_classification_uses_effective_semantics.sql', 'utf8');
const developmentReset = await readFile('supabase/admin/reset_development_data.sql', 'utf8');
const repository = await readFile('apps/web/src/ledger/supabase-ledger.ts', 'utf8');

assert.match(migration, /create table public\.transaction_semantic_overrides/i);
assert.match(migration, /alter table public\.transaction_semantic_overrides enable row level security/i);
assert.match(migration, /owner_id = \(select auth\.uid\(\)\)/i);
assert.match(migration, /grant select on table public\.transaction_semantic_overrides to authenticated/i);
assert.doesNotMatch(migration, /grant (insert|update|delete).*transaction_semantic_overrides.*authenticated/i);
assert.match(migration, /security definer set search_path = public, pg_temp/i);
assert.match(migration, /source = 'pluggy'[\s\S]*for update/i);
assert.match(migration, /Counterpart transaction does not match the transfer/i);
assert.match(migration, /Savings box balance is insufficient/i);
assert.match(migration, /grant execute on function public\.confirm_transaction_semantics.*to authenticated/i);
assert.doesNotMatch(migration, /update public\.transactions/i);
assert.match(repository, /applyTransactionSemantics/);
assert.match(repository, /from\('transaction_semantic_overrides'\)/);
for (const relation of ['transaction', 'counterpart', 'statement', 'savings_box']) {
  assert.match(indexes, new RegExp(`create index semantic_overrides_${relation}_owner`, 'i'));
}
assert.match(effectiveClassification, /coalesce\(semantic\.effective_nature, transaction_row\.nature\)/i);
assert.match(effectiveClassification, /Effective transaction nature cannot be categorized/i);
assert.match(effectiveClassification, /coalesce\(candidate_semantic\.effective_nature, candidate\.nature\) in \('income', 'expense'\)/i);
assert.match(developmentReset, /^begin;/i);
assert.match(developmentReset, /exactly one owner profile/i);
assert.match(developmentReset, /lock table public\.transactions in access exclusive mode/i);
assert.match(developmentReset, /disable trigger transactions_keep_imported_immutable/i);
assert.match(developmentReset, /enable trigger transactions_keep_imported_immutable/i);
assert.match(developmentReset, /immutability trigger was not restored/i);
assert.match(developmentReset, /delete from public\.transactions where owner_id = owner/i);
assert.match(developmentReset, /delete from private\.pluggy_transactions where owner_id = owner/i);
assert.match(developmentReset, /delete from private\.webhook_events event[\s\S]*connection\.owner_id = owner/i);
assert.doesNotMatch(developmentReset, /delete from private\.webhook_events\s*;/i);
assert.match(developmentReset, /delete from public\.classification_rules where owner_id = owner and evidence_type <> 'alias'/i);
assert.doesNotMatch(developmentReset, /delete from (auth\.users|public\.profiles|public\.categories)/i);
assert.match(developmentReset, /Protected Auth, profile, category or alias data changed/i);
assert.match(developmentReset, /commit;\s*$/i);

console.log('✓ Overlay semântico, vínculos atômicos, imutabilidade, grants e RLS validados estaticamente.');
