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
assert.match(developmentReset, /delete from public\.transaction_review_history where owner_id = owner/i);

// Etapa 11.2: versões substituídas e lado manual da transferência própria.
const reviewVersions = await readFile('supabase/migrations/20261118150000_review_versions_and_manual_counterpart.sql', 'utf8');
assert.match(reviewVersions, /alter table public\.transaction_review_history enable row level security/i);
assert.match(reviewVersions, /owner_id = \(select auth\.uid\(\)\)/i);
assert.doesNotMatch(reviewVersions, /grant (insert|update|delete).*transaction_review_history/i);
assert.match(reviewVersions, /before delete on public\.transaction_semantic_overrides/i);
assert.match(reviewVersions, /old\.status = 'confirmed' and old\.category_id is distinct from new\.category_id/i);
assert.doesNotMatch(reviewVersions, /delete from public\.classification_rules/i, 'aliases nunca são removidos por revisão');
assert.doesNotMatch(reviewVersions, /update public\.transactions/i);
assert.match(reviewVersions, /not exists \(select 1 from private\.pluggy_accounts linked where linked\.account_id = account\.id\)/i);
assert.match(reviewVersions, /account\.account_type <> 'credit_card'/i);
assert.match(reviewVersions, /-transaction_row\.amount_cents,\s*'own_transfer', 'neutral', 'manual'/i);
assert.match(reviewVersions, /delete from public\.transactions\s+where id = previous_counterpart_id and owner_id = current_owner and source = 'manual'/i);
assert.match(reviewVersions, /grant execute on function public\.confirm_transaction_semantics\(uuid, text, uuid, uuid, uuid, uuid\) to authenticated/i);
assert.match(repository, /p_counterpart_account_id/);
assert.match(repository, /from\('transaction_review_history'\)/);

console.log('✓ Overlay semântico, vínculos atômicos, imutabilidade, grants e RLS validados estaticamente.');
