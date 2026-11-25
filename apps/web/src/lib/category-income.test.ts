import assert from 'node:assert/strict';
import test from 'node:test';
import type { Category, TransactionContract } from '@personal-finance/domain';
import { categoryIncomeMonth, categoryIncomeYear } from './category-income.ts';

const tx = (id: string, competence: string, amountCents: bigint, categoryId?: string, nature?: TransactionContract['nature']): TransactionContract => ({
  id, accountId: 'a', description: id, amountCents, ...(categoryId ? { categoryId } : {}),
  nature: nature ?? (amountCents < 0n ? 'expense' : 'income'), reporting: nature === 'savings_contribution' ? 'neutral' : amountCents < 0n ? 'expense' : 'income',
  source: 'pluggy', eventDate: `${competence}-05`, competence, classificationStatus: 'confirmed'
});
const categories: Category[] = [
  { id: 'housing', name: 'Moradia', type: 'system', applicability: 'expense', iconKey: 'home', colorKey: 'chart-category-1' },
  { id: 'food', name: 'Alimentação', type: 'system', applicability: 'expense', iconKey: 'utensils', colorKey: 'chart-category-2' }
] as Category[];
const transactions = [tx('s', '2026-11', 1000000n, 'salary'), tx('r', '2026-11', -200000n, 'housing'), tx('f', '2026-11', -150000n, 'food'),
  tx('x', '2026-11', -5000n), tx('c', '2026-11', -50000n, 'savings', 'savings_contribution')];
const input = { transactions, categories, fixedItems: [], fixedItemLinks: [], installments: [], savingsBoxes: [], savingsMovements: [],
  budgets: [{ id: 'b', categoryId: 'food', monthlyLimitCents: 180000n }], today: '2026-11-25' };

test('mês realizado: despesas por categoria, caixinhas e sobra somam a receita (D-085)', () => {
  const month = categoryIncomeMonth(input, '2026-11');
  assert.equal(month.projected, false);
  assert.equal(month.incomeCents, 1000000n);
  assert.deepEqual(month.shares.map(share => [share.key, share.valueCents]),
    [['housing', 200000n], ['food', 150000n], ['uncategorized', 5000n], ['savings', 50000n], ['leftover', 595000n]]);
  assert.equal(month.shares.find(share => share.key === 'food')!.metaCents, 180000n);
  assert.equal(month.shares[0]!.color, 'var(--color-chart-category-1)');
});

test('mês futuro usa o plano: metas por categoria e receita estimada', () => {
  const month = categoryIncomeMonth(input, '2026-12');
  assert.equal(month.projected, true);
  assert.deepEqual(month.shares.filter(share => share.key !== 'leftover').map(share => [share.key, share.valueCents]), [['food', 180000n]]);
});

test('12 meses: seis realizados até o atual e seis previstos', () => {
  const year = categoryIncomeYear(input);
  assert.equal(year.months.length, 12);
  assert.equal(year.months[5]!.current, true);
  assert.equal(year.months[5]!.competence, '2026-11');
  assert.equal(year.months[6]!.projected, true);
  assert.deepEqual(year.series.map(item => item.key), ['food', 'housing', 'uncategorized']);
});
