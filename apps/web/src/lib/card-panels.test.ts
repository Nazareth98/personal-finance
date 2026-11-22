import test from 'node:test';
import assert from 'node:assert/strict';
import type { TransactionContract } from '@personal-finance/domain';
import { buildCardPanels, defaultTab, limitShare } from './card-panels.ts';

const tx = (id: string, amountCents: bigint, description = 'Sintético'): TransactionContract => ({
  id, accountId: 'acc', description, amountCents, nature: 'expense', reporting: 'expense', source: 'pluggy',
  eventDate: '2026-11-08', competence: '2026-11', classificationStatus: 'confirmed'
});
const base = {
  accounts: [{ id: 'acc', name: 'Cartão sintético', type: 'credit_card' as const, openingBalanceCents: 0n }, { id: 'chk', name: 'Conta', type: 'checking' as const, openingBalanceCents: 0n }],
  cards: [{ id: 'card', accountId: 'acc', closingDay: 3, dueDay: 10, creditLimitCents: 500000n }],
  statements: [{ id: 's11', cardId: 'card', competence: '2026-11', closingDate: '2026-11-03', dueDate: '2026-11-10' }],
  entries: [{ id: 'e1', statementId: 's11', transactionId: 't1', type: 'purchase' as const }, { id: 'e2', statementId: 's11', transactionId: 't2', type: 'refund' as const }],
  transactions: [tx('t1', -12000n, 'Notebook 1/2'), tx('t2', 2000n, 'Estorno')],
  installments: [
    { id: 'i1', cardId: 'card', statementId: 's11', transactionId: 't1', description: 'Notebook', number: 1, total: 2, amountCents: 12000n, dueCompetence: '2026-11', status: 'posted' as const },
    { id: 'i2', cardId: 'card', statementId: 's11', description: 'Notebook', number: 2, total: 2, amountCents: 12000n, dueCompetence: '2026-12', status: 'projected' as const }
  ]
};

test('painel compõe fatura materializada, fatura prevista e limite comprometido', () => {
  const [panel, ...rest] = buildCardPanels(base);
  assert.equal(rest.length, 0);
  assert.deepEqual(panel!.tabs.map(tab => [tab.competence, tab.status, tab.openCents, tab.projectedCents]), [['2026-11', 'open', 10000n, 0n], ['2026-12', 'projected', 0n, 12000n]]);
  assert.deepEqual(panel!.tabs[0]!.lines.map(line => [line.detail, line.amountCents, line.credit]), [['Compra parcelada', 12000n, false], ['Estorno', 2000n, true]]);
  assert.equal(panel!.tabs[1]!.lines[0]!.description, 'Notebook 2/2');
  assert.equal(panel!.committedCents, 22000n);
  assert.equal(defaultTab(panel!.tabs)?.competence, '2026-11');
});

test('cartão sem configuração não tem abas; fatura paga cede a aba inicial à última materializada', () => {
  assert.deepEqual(buildCardPanels({ ...base, cards: [] })[0]!.tabs, []);
  const paid = buildCardPanels({ ...base, entries: [...base.entries, { id: 'e3', statementId: 's11', transactionId: 't3', type: 'payment' }], transactions: [...base.transactions, tx('t3', -10000n)] })[0]!;
  assert.equal(paid.tabs[0]!.status, 'paid');
  assert.equal(defaultTab(paid.tabs)?.competence, '2026-11');
  assert.equal(defaultTab([])?.competence, undefined);
});

test('participação no limite usa uma casa decimal sem arredondar para cima', () => {
  assert.deepEqual(limitShare(24000n, 500000n), { label: '4,8%', basisPoints: 480 });
  assert.deepEqual(limitShare(600000n, 500000n), { label: '120,0%', basisPoints: 12000 });
  assert.deepEqual(limitShare(1n, 0n), { label: '0,0%', basisPoints: 0 });
});
