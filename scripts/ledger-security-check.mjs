import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile('supabase/migrations/202611130003_financial_ledger.sql', 'utf8');
for (const table of ['financial_accounts', 'categories', 'credit_cards', 'transactions', 'transaction_links']) {
  assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
}
assert.match(sql, /owner_id = \(select auth\.uid\(\)\)/i);
assert.match(sql, /transactions_keep_imported_immutable/i);
assert.match(sql, /create unique index transactions_external_key/i);
assert.match(sql, /revoke all .* from anon, authenticated/i);
assert.doesNotMatch(sql, /grant .* to anon/i);
assert.doesNotMatch(sql, /grant (insert|update|delete).*transactions/i);
assert.match(sql, /grant execute .* to authenticated/i);
console.log('✓ Livro financeiro, imutabilidade, grants e RLS validados estaticamente.');
