import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile('supabase/migrations/20261116185031_transaction_semantic_overrides.sql', 'utf8');
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

console.log('✓ Overlay semântico, vínculos atômicos, imutabilidade, grants e RLS validados estaticamente.');
