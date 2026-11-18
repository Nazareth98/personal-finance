import test from 'node:test';
import assert from 'node:assert/strict';
import type { FinancialAccount, TransactionContract } from '@personal-finance/domain';
import { buildAccountPanels } from './account-panels.ts';
import { buildCardPanels } from './card-panels.ts';

let sequence = 0;
const tx = (accountId: string, amountCents: bigint, extra: Partial<TransactionContract> = {}): TransactionContract => ({
  id: `t${++sequence}`, accountId, description: 'Sintético', amountCents, nature: amountCents > 0n ? 'income' : 'expense',
  reporting: amountCents > 0n ? 'income' : 'expense', source: 'manual', eventDate: '2026-11-05', competence: '2026-11', classificationStatus: 'confirmed', ...extra
});
const accounts: FinancialAccount[] = [
  { id: 'main', name: 'Principal', type: 'checking', openingBalanceCents: 100000n },
  { id: 'reserve', name: 'Reserva', type: 'savings', openingBalanceCents: 500000n },
  { id: 'card', name: 'Cartão', type: 'credit_card', openingBalanceCents: 0n }
];
const transactions = [
  tx('main', 500000n), tx('main', -120000n, { eventDate: '2026-11-17' }),
  tx('main', -50000n, { nature: 'own_transfer', reporting: 'neutral' }), tx('reserve', 50000n, { nature: 'own_transfer', reporting: 'neutral' }),
  tx('main', -30000n, { competence: '2026-10', eventDate: '2026-10-02' }),
  tx('card', -15400n, { id: 'buy' })
];

test('agrupa por tipo e separa movimento da conta de receitas e despesas do mês', () => {
  const cardPanels = buildCardPanels({
    accounts, transactions, cards: [{ id: 'cc', accountId: 'card', closingDay: 3, dueDay: 10, creditLimitCents: 500000n }],
    statements: [{ id: 's', cardId: 'cc', competence: '2026-11', closingDate: '2026-11-03', dueDate: '2026-11-10' }],
    entries: [{ id: 'e', statementId: 's', transactionId: 'buy', type: 'purchase' }], installments: []
  });
  const panels = buildAccountPanels({ accounts, transactions, cardPanels, month: '2026-11' });
  assert.deepEqual(panels.groups.map(group => [group.kind, group.items.map(item => item.account.name)]),
    [['checking', ['Principal']], ['reserve', ['Reserva']], ['credit_card', ['Cartão']]]);
  const main = panels.groups[0]!.items[0]!;
  assert.deepEqual([main.balanceCents, main.inCents, main.outCents, main.lastEventDate], [400000n, 500000n, 170000n, '2026-11-17']);
  // Disponível ignora o cartão; receitas e despesas ignoram a transferência própria.
  assert.equal(panels.availableCents, 400000n + 550000n);
  assert.deepEqual([panels.incomeCents, panels.expenseCents], [500000n, 135400n]);
  const card = panels.groups[2]!.items[0]!;
  assert.deepEqual([card.bill?.openCents, card.bill?.dueDate, card.bill?.limitLabel], [15400n, '2026-11-10', '3,0%']);
  assert.equal(panels.openBillsCents, 15400n);
});
