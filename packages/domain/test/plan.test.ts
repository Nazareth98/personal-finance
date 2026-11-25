import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMonthPlan, type CardInstallment, type TransactionContract } from '../src/index.ts';

const tx = (id: string, competence: string, amountCents: bigint, description: string, categoryId?: string): TransactionContract => ({
  id, accountId: 'a', description, amountCents, ...(categoryId ? { categoryId } : {}),
  nature: amountCents < 0n ? 'expense' : 'income', reporting: amountCents < 0n ? 'expense' : 'income',
  source: 'pluggy', eventDate: `${competence}-05`, competence, classificationStatus: 'confirmed'
});
const transactions = [
  tx('s', '2026-11', 1050000n, 'SALARIO', 'salary'), tx('r', '2026-11', -180000n, 'ALUGUEL', 'housing'),
  tx('l', '2026-11', -24837n, 'LUZ', 'housing'), tx('n', '2026-11', -5590n, 'STREAMING', 'subscriptions'),
  tx('p1', '2026-11', -30000n, 'LOJA 1/3', 'shopping')
];
const items = [
  { id: 'salary', name: 'Salário', nature: 'income' as const, matchKey: 'salario' },
  { id: 'rent', name: 'Aluguel', nature: 'expense' as const, categoryId: 'housing', matchKey: 'aluguel' },
  { id: 'light', name: 'Luz', nature: 'expense' as const, categoryId: 'housing', matchKey: 'luz' },
  { id: 'stream', name: 'Streaming', nature: 'expense' as const, categoryId: 'subscriptions', matchKey: 'streaming' }
];
const links = [['s', 'salary'], ['r', 'rent'], ['l', 'light'], ['n', 'stream']]
  .map(([transactionId, fixedItemId]) => ({ transactionId: transactionId!, fixedItemId: fixedItemId!, linkedBy: 'owner' as const }));
const installments: CardInstallment[] = [
  { id: 'i1', cardId: 'c', statementId: 's1', transactionId: 'p1', description: 'LOJA 1/3', number: 1, total: 3, amountCents: 30000n, dueCompetence: '2026-11', status: 'posted' },
  { id: 'i2', cardId: 'c', statementId: 's2', description: 'LOJA 2/3', number: 2, total: 3, amountCents: 30000n, dueCompetence: '2026-12', status: 'projected' }
];

test('plano do mês: receita dos fixos − aportes, metas incluem fixos e parcelas pela categoria (D-084)', () => {
  const plan = buildMonthPlan({ competence: '2026-12', transactions, fixedItems: items, fixedItemLinks: links, installments,
    budgets: [{ id: 'b1', categoryId: 'housing', monthlyLimitCents: 200000n }, { id: 'b2', categoryId: 'food', monthlyLimitCents: 150000n }],
    savingsBoxes: [{ id: 'trip', name: 'Viagem', openingBalanceCents: 0n, targetCents: 120000n, targetDate: '2027-05-31' }], savingsMovements: [] });
  assert.equal(plan.incomeSource, 'fixed');
  assert.equal(plan.incomeCents, 1050000n);
  assert.equal(plan.savingsCents, 20000n);
  assert.equal(plan.distributableCents, 1030000n);
  const housing = plan.commitments.find(item => item.categoryId === 'housing')!;
  assert.equal(housing.fixedCents, 204837n);
  // Moradia: meta 2.000 < comprometido 2.048,37 → pesa o comprometido; Alimentação pesa a meta;
  // Assinaturas (5,59) e a parcela de Compras (300) não têm meta e entram pelo comprometido.
  assert.equal(plan.unbudgetedCommittedCents, 35590n);
  assert.equal(plan.plannedCents, 204837n + 150000n + 35590n);
  assert.equal(plan.leftoverCents, 1030000n - plan.plannedCents);
  assert.equal(plan.commitments.find(item => item.categoryId === 'shopping')!.items[0]!.label, 'LOJA (2/3)');
});

test('sem fixos de receita, usa a estimativa das categorias recorrentes', () => {
  const plan = buildMonthPlan({ competence: '2026-12', transactions, fixedItems: [], fixedItemLinks: [], installments: [],
    budgets: [], savingsBoxes: [], savingsMovements: [] });
  assert.equal(plan.incomeSource, 'estimate');
  assert.equal(plan.incomeCents, 1050000n / 6n);
  assert.equal(plan.leftoverCents, plan.incomeCents);
});

test('fixo de receita ainda sem lançamento não zera a receita: cai na estimativa', () => {
  const plan = buildMonthPlan({ competence: '2026-12', transactions, fixedItems: [{ id: 'x', name: 'Bônus', nature: 'income', matchKey: 'bonus' }],
    fixedItemLinks: [], installments: [], budgets: [], savingsBoxes: [], savingsMovements: [] });
  assert.equal(plan.incomeSource, 'estimate');
  assert.equal(plan.incomeCents, 1050000n / 6n);
});

test('meses futuros mantêm a estimativa de receita e os aportes do mês seguinte ao atual', () => {
  const input = { transactions, fixedItems: [], fixedItemLinks: [], installments: [], budgets: [], savingsMovements: [],
    savingsBoxes: [{ id: 'trip', name: 'Viagem', openingBalanceCents: 0n, targetCents: 120000n, targetDate: '2027-05-31' }], today: '2026-11-25' };
  const dec = buildMonthPlan({ ...input, competence: '2026-12' });
  const mar = buildMonthPlan({ ...input, competence: '2027-03' });
  assert.equal(mar.incomeCents, dec.incomeCents);
  assert.equal(mar.savingsCents, dec.savingsCents);
  assert.equal(dec.savingsCents, 20000n);
});

test('previsão de Relatórios = plano de cada mês (mesmo número em Orçamentos)', async () => {
  const { buildPlanForecast } = await import('../src/index.ts');
  const common = { transactions, fixedItems: items, fixedItemLinks: links, installments, savingsMovements: [], today: '2026-11-25',
    budgets: [{ id: 'b1', categoryId: 'housing', monthlyLimitCents: 200000n }],
    savingsBoxes: [{ id: 'trip', name: 'Viagem', openingBalanceCents: 0n, targetCents: 120000n, targetDate: '2027-05-31' }] };
  const forecast = buildPlanForecast({ ...common, startCompetence: '2026-12' });
  assert.equal(forecast.length, 6);
  const december = buildMonthPlan({ ...common, competence: '2026-12' });
  assert.equal(forecast[0]!.netCents, december.leftoverCents);
  assert.equal(forecast[0]!.installmentsCents, 30000n);
  assert.equal(forecast[1]!.installmentsCents, 0n);
  assert.equal(forecast[0]!.fixedCents, 210427n);
});
