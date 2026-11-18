import test from 'node:test';
import assert from 'node:assert/strict';
import type { SavingsBox, SavingsMovement } from '@personal-finance/domain';
import { buildSavingsPanels } from './savings-panels.ts';

const box = (id: string, name: string, openingBalanceCents: bigint, targetCents: bigint, targetDate?: string): SavingsBox =>
  ({ id, name, openingBalanceCents, targetCents, ...(targetDate ? { targetDate } : {}) });
let sequence = 0;
const move = (savingsBoxId: string, type: SavingsMovement['type'], amountCents: bigint, eventDate: string): SavingsMovement =>
  ({ id: `m${++sequence}`, savingsBoxId, transactionId: `t${sequence}`, type, amountCents, eventDate });

const boxes = [
  box('reserve', 'Reserva', 200000n, 1200000n, '2027-12-31'),
  box('trip', 'Viagem', 0n, 600000n, '2027-06-30'),
  box('free', 'Investimentos', 300000n, 2000000n),
  box('laptop', 'Notebook', 500000n, 500000n, '2026-03-31'),
  box('late', 'Curso', 0n, 100000n, '2026-10-31')
];
const movements = [
  move('reserve', 'contribution', 580000n, '2026-06-08'),
  move('reserve', 'contribution', 50000n, '2026-09-08'),
  move('reserve', 'withdrawal', 50000n, '2026-09-15'),
  move('reserve', 'contribution', 55000n, '2026-10-08'),
  move('reserve', 'contribution', 50000n, '2026-11-08'),
  move('reserve', 'withdrawal', 105000n, '2026-08-20'),
  move('trip', 'contribution', 100000n, '2026-10-05'),
  move('trip', 'contribution', 20000n, '2026-11-05'),
  move('late', 'contribution', 40000n, '2026-09-01')
];

test('plano mensal segue a regra da previsão e o ritmo usa a média de três meses', () => {
  const panels = buildSavingsPanels({ boxes, movements, today: '2026-11-18' });
  const all = panels.groups.flatMap(group => group.items);
  const reserve = all.find(item => item.box.id === 'reserve')!;
  // Saldo 2.000 + 7.350 − 1.550 = 7.800; faltam 4.200 em 14 meses (nov/26 a dez/27).
  assert.equal(reserve.progress.balanceCents, 780000n);
  assert.equal(reserve.monthlyNeededCents, 30000n);
  // Set–nov: 500 − 500 + 550 + 500 = 1.050 / 3 = 350 ≥ 300.
  assert.equal(reserve.averageNetCents, 35000n);
  assert.equal(reserve.status, 'ontrack');
  const trip = all.find(item => item.box.id === 'trip')!;
  assert.equal(trip.monthlyNeededCents, 60000n);
  assert.equal(trip.averageNetCents, 40000n);
  assert.equal(trip.status, 'behind');
  const late = all.find(item => item.box.id === 'late')!;
  assert.deepEqual([late.status, late.overdue, late.monthlyNeededCents], ['behind', true, 60000n]);
  assert.equal(reserve.movements[0]!.eventDate, '2026-11-08');
});

test('agrupa do que pede ação para o que terminou e soma o resumo', () => {
  const panels = buildSavingsPanels({ boxes, movements, today: '2026-11-18' });
  assert.deepEqual(panels.groups.map(group => [group.status, group.items.map(item => item.box.name)]), [
    ['behind', ['Viagem', 'Curso']], ['ontrack', ['Reserva']], ['nodate', ['Investimentos']], ['done', ['Notebook']]
  ]);
  assert.equal(panels.totalBalanceCents, 780000n + 120000n + 300000n + 500000n + 40000n);
  assert.equal(panels.totalRemainingCents, 420000n + 480000n + 1700000n + 0n + 60000n);
  // A vencida não entra no aporte mensal: o prazo já passou.
  assert.equal(panels.monthlyNeededCents, 30000n + 60000n);
  assert.equal(panels.netThisMonthCents, 70000n);
});
