import test from 'node:test';
import assert from 'node:assert/strict';
import { cardOverview, type CardPanel, type StatementTab } from './card-panels.ts';

const account = { id: 'a', name: 'Cartão', type: 'credit_card', openingBalanceCents: 0n } as unknown as CardPanel['account'];
const card = { id: 'c', accountId: 'a', closingDay: 8, dueDay: 15, creditLimitCents: 100_000n } as CardPanel['card'];
const tab = (over: Partial<StatementTab>): StatementTab => ({ competence: '2026-12', status: 'open', purchasesCents: 50_000n, refundsCents: 0n, paymentsCents: 0n,
  openCents: 50_000n, projectedCents: 0n, lines: [], statement: { id: 's', cardId: 'c', competence: '2026-12', closingDate: '2026-12-08', dueDate: '2026-12-15' }, ...over });
const panel = (tabs: StatementTab[], committed = 60_000n): CardPanel => ({ account, card, committedCents: committed, tabs });

test('situação da fatura em relação a hoje', () => {
  const p = panel([tab({}), { ...tab({ competence: '2027-01', statement: undefined, status: 'projected', openCents: 0n, projectedCents: 10_000n }) }]);
  assert.equal(cardOverview(p, '2026-12-05').statusLabel, 'Aberta · fecha em 3 dias');
  assert.equal(cardOverview(p, '2026-12-08').statusLabel, 'Fechada · vence em 7 dias');
  assert.equal(cardOverview(p, '2026-12-15').statusLabel, 'Fechada · vence hoje');
  assert.equal(cardOverview(p, '2026-12-16').statusLabel, 'Vencida há 1 dia');
  assert.equal(cardOverview(p, '2026-12-05').nextProjectedCents, 10_000n);
  assert.equal(cardOverview(p, '2026-12-05').freeCents, 40_000n);
});

test('paga mostra o total da fatura; sem configuração vai para o fim', () => {
  const paid = cardOverview(panel([tab({ status: 'paid', openCents: 0n })]), '2026-12-20');
  assert.equal(paid.statusLabel, 'Paga');
  assert.equal(paid.currentCents, 50_000n);
  const pending = cardOverview({ account, committedCents: 0n, tabs: [] }, '2026-12-20');
  assert.equal(pending.statusLabel, 'Configuração pendente');
  assert.ok(pending.sortKey > paid.sortKey);
});
