import test from 'node:test';
import assert from 'node:assert/strict';
import type { CategoryBudgetProgress, TransactionContract } from '@personal-finance/domain';
import { budgetAttention, monthComparison, nextCardCommitment, reviewAttention } from './overview-attention.ts';

const tx = (id: string, competence: string, amountCents: bigint, nature: TransactionContract['nature'], reporting: TransactionContract['reporting'], extra: Partial<TransactionContract> = {}): TransactionContract => ({
  id, accountId: 'a', description: 'Sintético', amountCents, nature, reporting, source: 'manual',
  eventDate: `${competence}-05`, competence, classificationStatus: 'confirmed', ...extra
});
const empty = { semanticOverrides: [], links: [], savingsMovements: [], cardStatementEntries: [] };

test('comparação separa variação de patrimônio do resultado', () => {
  const rows = [
    tx('1', '2026-10', 620000n, 'income', 'income'),
    tx('2', '2026-11', 500000n, 'income', 'income'), tx('3', '2026-11', -23000n, 'expense', 'expense'),
    tx('4', '2026-11', -12000n, 'card_payment', 'neutral')
  ];
  const result = monthComparison(rows, [{ id: 'a', name: 'Conta', type: 'checking', openingBalanceCents: 0n }], '2026-11');
  assert.deepEqual(result, { previous: '2026-10', balanceDeltaCents: 465000n, incomeDeltaCents: -120000n, expenseDeltaCents: 23000n });
});

test('pendências separam vínculos de categorias', () => {
  const rows = [
    tx('p', '2026-11', -12000n, 'card_payment', 'neutral', { source: 'pluggy' }),
    tx('c', '2026-11', -1000n, 'expense', 'expense', { source: 'pluggy', classificationStatus: 'suggested' }),
    tx('ok', '2026-11', -1000n, 'expense', 'expense', { source: 'pluggy' })
  ];
  assert.deepEqual(reviewAttention(rows, empty), { total: 2, links: 1, categories: 1 });
});

test('próximo compromisso ignora meses vazios e anteriores ao período', () => {
  const series = [
    { competence: '2026-10', label: 'out/2026', valueCents: 5000n },
    { competence: '2026-11', label: 'nov/2026', valueCents: 0n },
    { competence: '2026-12', label: 'dez/2026 (previsto)', valueCents: 12000n }
  ];
  assert.equal(nextCardCommitment(series, '2026-11')?.label, 'dez/2026 (previsto)');
});

test('metas destacam estouro, proximidade e maior uso', () => {
  const progress = (usageBasisPoints: bigint, status: CategoryBudgetProgress['status']): CategoryBudgetProgress =>
    ({ incomeCents: 0n, limitCents: 0n, usedCents: 0n, remainingCents: 0n, usageBasisPoints, status });
  assert.deepEqual(budgetAttention([
    { category: 'Mercado', progress: progress(2000n, 'within') },
    { category: 'Lazer', progress: progress(10500n, 'exceeded') }
  ]), { exceeded: 1, approaching: 0, highest: { category: 'Lazer', usageBasisPoints: 10500n } });
});
