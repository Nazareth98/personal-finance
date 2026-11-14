import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sync = await readFile(new URL('../supabase/functions/_shared/sync.ts', import.meta.url), 'utf8');
const forecast = await readFile(new URL('../packages/domain/src/forecast.ts', import.meta.url), 'utf8');

assert.match(sync, /recognizeItauSalary\(item\.description, item\.institutionName\)/, 'salário deve exigir descrição e instituição');
assert.match(sync, /category_id: 'salary'/, 'salário reconhecido deve usar o overlay de categoria');
assert.match(sync, /classified\.has\(transactionId\)/, 'reconhecimento automático não pode sobrescrever classificação existente');
assert.match(forecast, /recurringIncomeCategories = new Set\(\['salary', 'other_recurring_income'\]\)/, 'extraordinária deve ficar fora da média');
assert.match(forecast, /group\.periods\.size >= 2/, 'despesa recorrente precisa ocorrer em mais de uma competência');
assert.match(forecast, /item\.status === 'projected'/, 'somente parcelas futuras entram na previsão');
assert.match(forecast, /savingsBoxProgress/, 'aportes planejados devem partir do saldo reconstruído');

console.log('Forecast recurrence and immutability checks passed.');
