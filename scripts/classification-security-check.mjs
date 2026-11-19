import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile('supabase/migrations/202611140002_classification.sql', 'utf8');
const classifier = await readFile('packages/domain/src/classification.ts', 'utf8');
const sync = await readFile('supabase/functions/_shared/sync.ts', 'utf8');

assert.match(sql, /create table public\.classification_rules/i);
assert.match(sql, /create table public\.transaction_classifications/i);
assert.match(sql, /create table public\.classification_feedback/i);
assert.match(sql, /Overlay versionado/i);
assert.match(sql, /source = 'pluggy'.*nature in \('income', 'expense'\)/is);
assert.match(sql, /on conflict \(transaction_id\) do update[\s\S]*status <> 'confirmed'/i);
assert.match(sql, /'alias'.*9000.*'feedback'/is);
assert.match(sql, /grant execute on function public\.confirm_transaction_classification.*to authenticated/i);
assert.doesNotMatch(sql, /grant (insert|update|delete).*classification_.*authenticated/i);
assert.doesNotMatch(sql, /update public\.transactions/i);
assert.match(classifier, /winner\.score >= 9000/);
assert.match(classifier, /winner\.score >= 7000/);
assert.match(classifier, /ranked\[1\].*winner\.score/);
assert.match(sync, /persistClassifications/);
assert.match(sync, /ignoreDuplicates: true/);

console.log('✓ Classificação: overlay imutável, faixas 90/70, feedback e aprendizado validados estaticamente.');

// D-060: confirmação em lote só pelo dono, limitada e atômica, sem caminho próprio de escrita.
{
  const bulk = await readFile('supabase/migrations/20261119170000_confirm_similar_classifications.sql', 'utf8');
  assert.ok(bulk.includes('language plpgsql security definer set search_path = public, private, pg_temp'));
  assert.ok(bulk.includes("if auth.uid() is null then raise exception 'Authentication required'; end if;"));
  assert.ok(bulk.includes('not between 1 and 200'));
  assert.ok(bulk.includes('perform public.confirm_transaction_classification(item, p_category_id);'));
  assert.ok(!/insert into|update public\.|delete from/i.test(bulk), 'o lote só delega à confirmação individual');
  assert.ok(bulk.includes('revoke all on function public.confirm_transaction_classifications(uuid[], text) from public, anon;'));
  assert.ok(bulk.includes('grant execute on function public.confirm_transaction_classifications(uuid[], text) to authenticated;'));
  console.log('✓ Confirmação em lote delega à individual, limitada a 200 e só para o dono.');
}
