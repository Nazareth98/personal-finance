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
