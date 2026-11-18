import test from 'node:test';
import assert from 'node:assert/strict';
import type { TransactionContract } from '@personal-finance/domain';
import { cardCommitmentSeries, cashFlowSeries, competenceWindow, cumulativeResultSeries } from './overview-charts.ts';

const tx = (id: string, competence: string, amountCents: bigint, reporting: TransactionContract['reporting'], nature: TransactionContract['nature']): TransactionContract => ({
  id, accountId: 'a', description: 'Sintético', amountCents, nature, reporting, source: 'manual',
  eventDate: `${competence}-05`, competence, classificationStatus: 'confirmed'
});

test('janela de competências atravessa a virada do ano', () => {
  assert.deepEqual(competenceWindow('2026-02', 3), ['2025-12', '2026-01', '2026-02']);
});

test('fluxo e resultado acumulado usam os totais do livro sem contar transferências', () => {
  const rows = [
    tx('1', '2026-10', 500000n, 'income', 'income'), tx('2', '2026-10', -100000n, 'expense', 'expense'),
    tx('3', '2026-11', -50000n, 'neutral', 'own_transfer'), tx('4', '2026-11', -700000n, 'expense', 'expense')
  ];
  const flow = cashFlowSeries(rows, ['2026-10', '2026-11']);
  assert.deepEqual(flow, [
    { label: 'out/2026', axisLabel: 'out', incomeCents: 500000n, expenseCents: 100000n },
    { label: 'nov/2026', axisLabel: 'nov', incomeCents: 0n, expenseCents: 700000n }
  ]);
  assert.deepEqual(cumulativeResultSeries(flow).map(point => point.valueCents), [400000n, -300000n]);
});

test('compromissos de cartão somam fatura líquida e parcelas projetadas', () => {
  const purchase = tx('p', '2026-11', -30000n, 'expense', 'expense');
  const refund = tx('r', '2026-11', 5000n, 'neutral', 'refund');
  const series = cardCommitmentSeries({
    statements: [{ id: 's', cardId: 'c', competence: '2026-11', closingDate: '2026-11-03', dueDate: '2026-11-10' }],
    entries: [{ id: 'e1', statementId: 's', transactionId: 'p', type: 'purchase' }, { id: 'e2', statementId: 's', transactionId: 'r', type: 'refund' }],
    transactions: [purchase, refund],
    installments: [
      { id: 'i1', cardId: 'c', statementId: 's2', description: 'Parcela', number: 2, total: 2, amountCents: 12000n, dueCompetence: '2026-12', status: 'projected' },
      { id: 'i2', cardId: 'c', statementId: 's', description: 'Parcela', number: 1, total: 2, amountCents: 12000n, dueCompetence: '2026-11', status: 'posted' }
    ],
    months: ['2026-11', '2026-12'], period: '2026-11'
  });
  assert.deepEqual(series, [
    { competence: '2026-11', label: 'nov/2026', axisLabel: 'nov', valueCents: 25000n, projected: false, current: true },
    { competence: '2026-12', label: 'dez/2026', axisLabel: 'dez', valueCents: 12000n, projected: true, current: false }
  ]);
});
