import assert from 'node:assert/strict';
import test from 'node:test';
import { accountBalance, isConsumption, ledgerTotals, requireNonZeroCents, transactionNatures, validateTransaction, type TransactionContract } from '../src/index.ts';

const base: TransactionContract = {
  id: 't1', accountId: 'a1', description: 'Teste', amountCents: -1000n,
  nature: 'expense', reporting: 'expense', source: 'manual', eventDate: '2026-11-13',
  competence: '2026-11', classificationStatus: 'confirmed'
};

test('mantém naturezas patrimoniais fora do consumo', () => {
  assert.equal(isConsumption('expense'), true);
  for (const nature of transactionNatures.filter(item => item !== 'expense')) {
    assert.equal(isConsumption(nature), false, nature);
  }
});

test('rejeita lançamento financeiro de valor zero', () => {
  assert.equal(requireNonZeroCents(1250n), 1250n);
  assert.throws(() => requireNonZeroCents(0n), RangeError);
});

test('deriva totais sem contar transferências duas vezes', () => {
  const transactions: TransactionContract[] = [
    { ...base, id: 'income', amountCents: 5000n, nature: 'income', reporting: 'income' },
    base,
    { ...base, id: 'transfer-out', amountCents: -2000n, nature: 'own_transfer', reporting: 'neutral' },
    { ...base, id: 'transfer-in', accountId: 'a2', amountCents: 2000n, nature: 'own_transfer', reporting: 'neutral' },
    { ...base, id: 'adjustment', amountCents: -250n, nature: 'adjustment', reporting: 'expense' }
  ];
  assert.deepEqual(ledgerTotals(transactions), { incomeCents: 5000n, expenseCents: 1250n, netCents: 3750n });
  assert.equal(accountBalance({ id: 'a1', name: 'Conta', type: 'checking', openingBalanceCents: 10000n }, transactions), 11750n);
});

test('rejeita sinal incompatível com o efeito financeiro', () => {
  assert.throws(() => validateTransaction({ ...base, amountCents: 1000n }), RangeError);
  assert.throws(() => validateTransaction({ ...base, nature: 'own_transfer' }), RangeError);
});
