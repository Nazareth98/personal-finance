import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile('supabase/migrations/202611140001_meupluggy.sql', 'utf8');
const conflictMigration = await readFile('supabase/migrations/20261116165312_fix_transactions_external_key_conflict.sql', 'utf8');
const providerIdMigration = await readFile('supabase/migrations/20261117150000_pluggy_provider_id.sql', 'utf8');
const lifecycleMigration = await readFile('supabase/migrations/20261118105626_pluggy_transaction_lifecycle.sql', 'utf8');
const sync = await readFile('supabase/functions/_shared/sync.ts', 'utf8');
const syncEntry = await readFile('supabase/functions/pluggy-sync/index.ts', 'utf8');
const webhook = await readFile('supabase/functions/pluggy-webhook/index.ts', 'utf8');
const auth = await readFile('supabase/functions/_shared/supabase.ts', 'utf8');
const browser = await readFile('apps/web/src/integrations/supabase-connections.ts', 'utf8');

assert.match(migration, /create table public\.pluggy_connections/i);
assert.match(migration, /last_source_updated_at timestamptz/i);
assert.match(migration, /create table public\.sync_runs/i);
assert.match(migration, /create table private\.webhook_events/i);
assert.match(migration, /create table private\.pluggy_transactions/i);
assert.match(migration, /enable row level security/ig);
assert.match(migration, /grant select on table public\.pluggy_connections, public\.sync_runs to authenticated/i);
assert.doesNotMatch(migration, /grant (insert|update|delete).*pluggy_connections.*authenticated/i);
assert.doesNotMatch(migration, /grant .*private\.(webhook_events|pluggy_transactions).*authenticated/i);
assert.match(migration, /unique \(owner_id, external_transaction_id\)/i);
assert.match(conflictMigration, /drop index public\.transactions_external_key/i);
assert.match(conflictMigration, /unique \(owner_id, external_key\)/i);
assert.match(providerIdMigration, /add column provider_id text/i);
assert.match(providerIdMigration, /provider_id = coalesce\(excluded\.provider_id, private\.pluggy_transactions\.provider_id\)/i);
assert.match(providerIdMigration, /grant execute on function public\.internal_store_pluggy_transactions\(jsonb\) to service_role/i);
assert.match(lifecycleMigration, /add column source_deleted_at timestamptz/i);
assert.match(lifecycleMigration, /internal_mark_pluggy_transactions_deleted/i);
assert.match(lifecycleMigration, /revoke all on function public\.internal_mark_pluggy_transactions_deleted[\s\S]*from public, anon, authenticated/i);
assert.match(lifecycleMigration, /grant execute on function public\.internal_mark_pluggy_transactions_deleted[\s\S]*to service_role/i);
assert.match(lifecycleMigration, /deleted_at = null/i);
assert.match(migration, /sync_runs_one_active/i);
assert.match(migration, /grant execute on function public\.internal_register_webhook_event[\s\S]*to service_role/i);
assert.match(sync, /ignoreDuplicates: true/g);
assert.match(sync, /accountType === 'credit_card'/);
assert.match(sync, /last_source_updated_at: item\.lastUpdatedAt/);
assert.match(sync, /transactionCursor: page\.next/);
assert.match(sync, /mapped\.type === 'credit_card' \? undefined : incrementalFrom/);
assert.match(sync, /provider_id: transaction\.providerId\?\.slice\(0, 200\) \?\? null/);
assert.match(sync, /getTransactionsByIds/);
assert.match(sync, /synchronizeTransactionUpdates/);
assert.match(sync, /const POSTGREST_IN_CHUNK_SIZE = 100/);
assert.match(sync, /uniqueValues\.slice\(offset, offset \+ POSTGREST_IN_CHUNK_SIZE\)/);
assert.match(sync, /upsert\(\[\.\.\.statementRows\.values\(\)\]/);
assert.match(sync, /card_statement_entries'\)\.upsert\(entryRows/);
assert.match(sync, /card_installments'\)\.upsert\(\[\.\.\.projectedRows\.values\(\)\]/);
assert.match(sync, /card_installments'\)\.upsert\(\[\.\.\.postedRows\.values\(\)\]/);
assert.match(syncEntry, /last_source_updated_at: item\.lastUpdatedAt/);
assert.doesNotMatch(sync, /schema\('private'\)/);
assert.doesNotMatch(webhook, /schema\('private'\)/);
assert.match(migration, /internal_register_webhook_event/);
assert.match(webhook, /internal_register_webhook_event/);
assert.match(webhook, /waitUntil\(processEvent/);
assert.match(webhook, /eventType === 'transactions\/deleted'/);
assert.match(webhook, /eventType === 'transactions\/updated'/);
assert.match(auth, /headers: \{ Authorization: authorization \}/);
assert.doesNotMatch(browser, /PLUGGY_CLIENT_(ID|SECRET)|SERVICE_ROLE/i);
assert.match(browser, /last_source_updated_at/);
const client = await readFile('supabase/functions/_shared/pluggy-client.ts', 'utf8');
assert.match(client, /\/v2\/transactions/);
assert.match(client, /createdAtFrom/);
assert.doesNotMatch(client, /query\.set\('dateFrom'/);

console.log('✓ MeuPluggy: isolamento, staging, idempotência e fronteira de secrets validados estaticamente.');

// D-052: instituição por conta — só leitura, só o dono, sem credenciais nem ids externos.
{
  const { readFile: read } = await import('node:fs/promises');
  const { default: check } = await import('node:assert/strict');
  const sql = await read('supabase/migrations/20261119120000_account_institutions.sql', 'utf8');
  check.match(sql, /stable security definer set search_path = public, pg_temp/i);
  check.match(sql, /where pa\.owner_id = \(select auth\.uid\(\)\)/i);
  check.match(sql, /revoke all on function public\.get_account_institutions\(\) from public, anon/i);
  check.doesNotMatch(sql, /item_id|external_account_id|api_key|credential/i);
  // D-056: a versão vigente mantém as mesmas fronteiras; a gravação do banco é só do backend.
  const bank = await read('supabase/migrations/20261119150000_account_bank_institution.sql', 'utf8');
  check.match(bank, /where pa\.owner_id = \(select auth\.uid\(\)\)/i);
  check.match(bank, /revoke all on function public\.get_account_institutions\(\) from public, anon/i);
  check.match(bank, /revoke all on function public\.internal_set_pluggy_account_institution\(uuid, integer, text\) from public, anon, authenticated/i);
  check.match(bank, /grant execute on function public\.internal_set_pluggy_account_institution\(uuid, integer, text\) to service_role/i);
  check.doesNotMatch(bank, /item_id|external_account_id|api_key|credential/i);
  console.log('✓ Instituição por conta exposta só ao dono, sem identificadores do provedor.');
}

// D-064: chaves do Pluggy no Vault — segredo só no backend.
{
  const { readFile: read } = await import('node:fs/promises');
  const { default: check } = await import('node:assert/strict');
  const sql = await read('supabase/migrations/20261121120000_pluggy_credentials_vault.sql', 'utf8');
  const fn = await read('supabase/functions/pluggy-credentials/index.ts', 'utf8');
  check.match(sql, /create table private\.pluggy_credentials/i);
  check.match(sql, /vault\.create_secret\(/i);
  check.match(sql, /revoke all on table private\.pluggy_credentials from public, anon, authenticated/i);
  check.match(sql, /revoke all on function public\.internal_get_pluggy_credentials\(uuid\) from public, anon, authenticated/i);
  check.match(sql, /grant execute on function public\.internal_get_pluggy_credentials\(uuid\) to service_role/i);
  check.doesNotMatch(sql, /grant execute on function public\.internal_(get|set)_pluggy_credentials[^;]*to (anon|authenticated)/i);
  // O status visível ao app expõe só os 4 últimos caracteres do Client ID.
  check.match(sql, /right\(c\.client_id, 4\)/i);
  check.doesNotMatch(sql.split('get_pluggy_credentials_status')[1] ?? '', /decrypted_secret/i);
  // A função testa antes de gravar e nunca devolve o segredo.
  check.ok(fn.indexOf('await verifyPluggy(') < fn.indexOf('internal_set_pluggy_credentials'));
  check.doesNotMatch(fn, /json\(\{[^}]*clientSecret/);
  console.log('✓ Chaves do Pluggy: segredo no Vault, testado antes de gravar e nunca devolvido ao navegador.');
}
