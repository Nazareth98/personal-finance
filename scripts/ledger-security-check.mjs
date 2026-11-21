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
const accounts = await readFile('supabase/migrations/20261118202048_account_management.sql', 'utf8');
assert.equal((accounts.match(/security definer set search_path = public, pg_temp/gi) ?? []).length, 2);
assert.equal((accounts.match(/owner_id = current_owner and archived_at is null/gi) ?? []).length, 2);
assert.match(accounts, /set archived_at = now\(\)/i);
assert.doesNotMatch(accounts, /delete from/i);
assert.match(accounts, /grant execute on function public\.update_financial_account\(uuid, text, bigint\) to authenticated/i);
assert.match(accounts, /grant execute on function public\.archive_financial_account\(uuid\) to authenticated/i);
assert.doesNotMatch(accounts, /to anon/i);
console.log('✓ Livro financeiro, imutabilidade, contas arquiváveis, grants e RLS validados estaticamente.');
