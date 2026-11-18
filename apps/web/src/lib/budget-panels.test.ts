import test from 'node:test';
import assert from 'node:assert/strict';
import type { Category, TransactionContract } from '@personal-finance/domain';
import { buildBudgetPanels } from './budget-panels.ts';

const category = (id: string, name: string): Category => ({
  id, name, type: 'system', applicability: 'expense', iconKey: 'tag', colorKey: 'chart-category-1', sortOrder: 0, dependencyCount: 0
});
let sequence = 0;
const tx = (categoryId: string | undefined, amountCents: bigint, extra: Partial<TransactionContract> = {}): TransactionContract => ({
  id: `t${++sequence}`, accountId: 'acc', categoryId, description: 'Sintético', amountCents,
  nature: amountCents > 0n ? 'income' : 'expense', reporting: amountCents > 0n ? 'income' : 'expense', source: 'manual',
  eventDate: '2026-11-05', competence: '2026-11', classificationStatus: 'confirmed', ...extra
});
const categories = [category('food', 'Alimentação'), category('home', 'Moradia'), category('fun', 'Lazer'), category('gift', 'Presentes'), category('clothes', 'Vestuário')];
const transactions = [
  tx('salary', 1200000n),
  tx('food', -201000n), tx('home', -345000n), tx('fun', -10000n),
  tx('gift', -21000n), tx('clothes', -41000n),
  tx('clothes', -99900n, { classificationStatus: 'suggested' }),
  tx(undefined, -5000n, { classificationStatus: 'uncategorized' }),
  tx('gift', -7000n, { competence: '2026-10' })
];
const budgets = [
  { id: 'b1', categoryId: 'fun', percentageBasisPoints: 500 },
  { id: 'b2', categoryId: 'food', percentageBasisPoints: 1500 },
  { id: 'b3', categoryId: 'home', percentageBasisPoints: 3000 }
];

test('agrupa metas por situação, do estouro para a folga, e soma o comprometido', () => {
  const panels = buildBudgetPanels({ budgets, categories, transactions, period: '2026-11', today: '2026-11-18' });
  assert.equal(panels.incomeCents, 1200000n);
  assert.equal(panels.committedBasisPoints, 5000);
  assert.equal(panels.totalLimitCents, 600000n);
  assert.equal(panels.totalUsedCents, 556000n);
  assert.deepEqual(panels.groups.map(group => [group.status, group.items.map(item => item.name)]), [
    ['exceeded', ['Alimentação']], ['approaching', ['Moradia']], ['within', ['Lazer']]
  ]);
});

test('ritmo diário: quanto cabe por dia até o fim do mês e média de quem estourou', () => {
  const panels = buildBudgetPanels({ budgets, categories, transactions, period: '2026-11', today: '2026-11-18' });
  const [exceeded, approaching] = panels.groups;
  // Dia 18 de 30 conta o próprio dia: 13 dias restantes. Moradia: (360.000 − 345.000) / 13.
  assert.deepEqual(approaching!.items[0]!.pace, { kind: 'remaining', perDayCents: 1153n, days: 13 });
  // Alimentação: 201.000 / 18 por dia contra teto de 180.000 / 30.
  assert.deepEqual(exceeded!.items[0]!.pace, { kind: 'average', perDayCents: 11166n, limitPerDayCents: 6000n });
  const past = buildBudgetPanels({ budgets, categories, transactions, period: '2026-11', today: '2026-12-02' });
  assert.equal(past.groups[0]!.items[0]!.pace, undefined);
  const year = buildBudgetPanels({ budgets, categories, transactions, period: '2026', today: '2026-11-18' });
  assert.equal(year.groups[0]!.items[0]!.pace, undefined);
});

test('gastos sem meta: só despesas confirmadas ou automáticas do período, da maior para a menor', () => {
  const panels = buildBudgetPanels({ budgets, categories, transactions, period: '2026-11', today: '2026-11-18' });
  assert.deepEqual(panels.unbudgeted.map(item => [item.name, item.spentCents]), [['Vestuário', 41000n], ['Presentes', 21000n]]);
  assert.equal(panels.unbudgetedTotalCents, 62000n);
  const annual = buildBudgetPanels({ budgets, categories, transactions, period: '2026', today: '2026-11-18' });
  assert.equal(annual.unbudgeted.find(item => item.name === 'Presentes')?.spentCents, 28000n);
});
