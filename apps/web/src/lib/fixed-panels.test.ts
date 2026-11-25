import assert from 'node:assert/strict';
import test from 'node:test';
import type { TransactionContract } from '@personal-finance/domain';
import { buildFixedItemsPanel, fixedStatusLabel } from './fixed-panels.ts';

const tx = (id: string, competence: string, amountCents: bigint, day: string, description: string): TransactionContract => ({
  id, accountId: 'a', description, amountCents, nature: amountCents < 0n ? 'expense' : 'income', reporting: amountCents < 0n ? 'expense' : 'income',
  source: 'pluggy', eventDate: `${competence}-${day}`, competence, classificationStatus: 'confirmed'
});

test('aba Fixos: totais só dos ativos, receitas antes das despesas e situação do mês (D-084)', () => {
  const transactions = [tx('s1', '2026-11', 820000n, '05', 'SALARIO'), tx('s2', '2026-12', 830000n, '05', 'SALARIO'),
    tx('r1', '2026-11', -180000n, '10', 'ALUGUEL'), tx('l1', '2026-11', -23190n, '18', 'LUZ'), tx('o1', '2026-10', -5000n, '02', 'ANTIGO')];
  const items = [
    { id: 'rent', name: 'Aluguel', nature: 'expense' as const, matchKey: 'aluguel' },
    { id: 'light', name: 'Luz', nature: 'expense' as const, matchKey: 'luz' },
    { id: 'salary', name: 'Salário', nature: 'income' as const, matchKey: 'salario' },
    { id: 'old', name: 'Antigo', nature: 'expense' as const, matchKey: 'antigo', endedAt: '2026-11-01T00:00:00Z' }
  ];
  const links = [['s1', 'salary'], ['s2', 'salary'], ['r1', 'rent'], ['l1', 'light'], ['o1', 'old']]
    .map(([transactionId, fixedItemId]) => ({ transactionId: transactionId!, fixedItemId: fixedItemId!, linkedBy: 'owner' as const }));
  const panel = buildFixedItemsPanel({ items, links, transactions, categories: [], today: '2026-12-15' });
  assert.deepEqual(panel.active.map(row => row.item.id), ['salary', 'rent', 'light']);
  assert.deepEqual(panel.ended.map(row => row.item.id), ['old']);
  assert.equal(panel.incomeCents, 830000n);
  assert.equal(panel.expenseCents, 203190n);
  assert.equal(panel.doneCount, 1);
  assert.equal(panel.nextMonth, '2027-01');
  assert.deepEqual(panel.active.map(row => fixedStatusLabel(row)), ['Recebido', 'Atrasado', 'Pendente']);
  assert.equal(panel.ended[0]!.nextCents, 0n);
});
