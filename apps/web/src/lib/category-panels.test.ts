import test from 'node:test';
import assert from 'node:assert/strict';
import type { Category, TransactionContract } from '@personal-finance/domain';
import { buildCategoryPanels } from './category-panels.ts';

const category = (id: string, name: string, type: Category['type'], applicability: Category['applicability'], archivedAt?: string): Category => ({
  id, name, type, applicability, iconKey: 'tag', colorKey: 'chart-category-1', sortOrder: 0, dependencyCount: 0, ...(archivedAt ? { archivedAt } : {})
});
let sequence = 0;
const tx = (categoryId: string, amountCents: bigint, competence = '2026-11', classificationStatus: TransactionContract['classificationStatus'] = 'confirmed'): TransactionContract => ({
  id: `t${++sequence}`, accountId: 'a', categoryId, description: 'Sintético', amountCents, nature: amountCents > 0n ? 'income' : 'expense',
  reporting: amountCents > 0n ? 'income' : 'expense', source: 'manual', eventDate: `${competence}-05`, competence, classificationStatus
});
const categories = [
  category('salary', 'Salário', 'system', 'income'), category('food', 'Alimentação', 'system', 'expense'), category('home', 'Moradia', 'system', 'expense'),
  category('hobby', 'Hobbies', 'custom', 'expense'), category('old', 'Antiga', 'custom', 'expense', '2026-10-01T00:00:00Z')
];
const transactions = [
  tx('salary', 500000n), tx('food', -20000n), tx('food', -5000n), tx('food', -99900n, '2026-11', 'suggested'),
  tx('hobby', -3000n, '2026-06'), tx('home', -1000n, '2026-05')
];

test('separa personalizadas, estruturais e arquivadas, com gasto do mês, meta e uso recente', () => {
  const panels = buildCategoryPanels({ categories, budgets: [{ id: 'b', categoryId: 'food', percentageBasisPoints: 1500 }], transactions, month: '2026-11', filter: 'all', query: '' });
  assert.deepEqual(panels.custom.map(row => row.category.name), ['Hobbies']);
  assert.deepEqual(panels.system.map(row => [row.category.name, row.monthCents, row.budgetBasisPoints, row.idle]),
    [['Salário', 500000n, undefined, false], ['Alimentação', 25000n, 1500, false], ['Moradia', 0n, undefined, true]]);
  assert.deepEqual(panels.archived.map(row => row.category.name), ['Antiga']);
  // Hobbies usou em jun (dentro de jun–nov); Moradia só em mai (fora). Arquivadas não contam.
  assert.deepEqual([panels.activeCount, panels.customCount, panels.budgetedCount, panels.expenseCents, panels.idleCount], [4, 1, 1, 25000n, 1]);
});

test('filtro por aplicação e busca valem para todos os grupos', () => {
  const panels = buildCategoryPanels({ categories, budgets: [], transactions, month: '2026-11', filter: 'income', query: '' });
  assert.deepEqual([...panels.custom, ...panels.system].map(row => row.category.id), ['salary']);
  const search = buildCategoryPanels({ categories, budgets: [], transactions, month: '2026-11', filter: 'all', query: 'ali' });
  assert.deepEqual(search.system.map(row => row.category.id), ['food']);
});
