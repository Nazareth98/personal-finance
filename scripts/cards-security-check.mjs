import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const migration = await readFile(new URL('../supabase/migrations/202611140003_cards_installments.sql', import.meta.url), 'utf8');
const sync = await readFile(new URL('../supabase/functions/_shared/sync.ts', import.meta.url), 'utf8');
const ledger = await readFile(new URL('../apps/web/src/ledger/supabase-ledger.ts', import.meta.url), 'utf8');

for (const table of ['card_statements', 'card_statement_entries', 'card_installments']) {
  assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`), `${table} precisa de RLS`);
  assert.match(migration, new RegExp(`owner reads ${table.replaceAll('_', ' ')}`), `${table} precisa de política por proprietário`);
}
assert.match(migration, /revoke all on table public\.card_statements, public\.card_statement_entries, public\.card_installments from anon, authenticated/);
assert.match(migration, /nature = 'refund' and reporting = 'expense' and amount_cents > 0/);
assert.match(migration, /nature = 'card_payment' and reporting = 'neutral'/);
assert.match(migration, /status in \('posted', 'projected', 'refunded'\)/);
assert.match(sync, /cardCompetence\(eventDate, card\)/, 'compra de cartão precisa usar competência da fatura');
assert.match(sync, /upsert\(\[\.\.\.projectedRows\.values\(\)\],[\s\S]*ignoreDuplicates: true/,
  'projeção não pode sobrescrever parcela já realizada');
assert.match(sync, /upsert\(\[\.\.\.postedRows\.values\(\)\],[\s\S]*onConflict: 'owner_id,purchase_group_key,installment_number'/,
  'parcela realizada precisa substituir sua projeção');
assert.match(sync, /if \(!card\) continue/, 'não deve inventar competência sem calendário do cartão');
assert.match(ledger, /const SUPABASE_PAGE_SIZE = 1000/);
assert.match(ledger, /\.order\('event_date',[\s\S]*\.order\('id'\)[\s\S]*\.range\(from, from \+ SUPABASE_PAGE_SIZE - 1\)/,
  'o livro deve carregar todas as páginas em ordem estável');
assert.doesNotMatch(migration, /grant (insert|update|delete|all).*card_statements.*authenticated/i, 'tabelas derivadas não devem aceitar escrita direta do cliente');

console.log('Card statements/installments security checks passed.');
