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

// D-050: casamento automático de pagamento de fatura e linha informativa “TOTAL DA FATURA ANTERIOR”.
{
  const { readFile: read } = await import('node:fs/promises');
  const matching = await read('supabase/migrations/20261119110000_statement_carryover_and_payment_matching.sql', 'utf8');
  const trigger = await read('supabase/migrations/20261119113000_match_card_payments_trigger.sql', 'utf8');
  const { default: check } = await import('node:assert/strict');
  check.match(matching, /security definer set search_path = public, pg_temp/i);
  check.match(matching, /revoke all on function public\.internal_match_card_payments\(uuid\) from public, anon, authenticated/i);
  check.match(matching, /grant execute on function public\.internal_match_card_payments\(uuid\) to service_role/i);
  check.doesNotMatch(matching, /grant execute on function public\.internal_match_card_payments\(uuid\) to (anon|authenticated)/i);
  // Nunca sobrepõe decisão do proprietário nem lançamento confirmado.
  check.match(matching, /not exists \(select 1 from public\.transaction_semantic_overrides o where o\.transaction_id = t\.id\)/i);
  check.match(matching, /classification_status <> 'confirmed'/i);
  // Mesmo banco: conta e cartão na mesma conexão MeuPluggy.
  check.match(matching, /cpa\.connection_id = candidate\.connection_id/i);
  check.match(matching, /chosen_count <> 1/i);
  check.match(trigger, /pg_trigger_depth\(\) > 1/i);
  check.match(trigger, /revoke all on function private\.match_card_payments_after_insert\(\) from public, anon, authenticated/i);
  console.log('✓ Casamento de pagamento de fatura restrito ao backend, ao mesmo banco e sem sobrepor decisões.');
}
