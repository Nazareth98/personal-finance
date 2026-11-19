import assert from 'node:assert/strict';
import test from 'node:test';
import { accountBalance, applyTransactionSemantics, categoryBudgetProgress, isConsumption, ledgerTotals, requireNonZeroCents, savingsBoxProgress, transactionNatures, validateTransaction, type CategoryBudget, type SavingsBox, type SavingsMovement, type TransactionContract } from '../src/index.ts';

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

test('meta mensal por valor fixo, sem carregar saldo nem depender da receita', () => {
  const budget: CategoryBudget = { id: 'b1', categoryId: 'groceries', monthlyLimitCents: 60000n };
  const transactions: TransactionContract[] = [
    { ...base, id: 'salary', amountCents: 500000n, nature: 'income', reporting: 'income', categoryId: 'salary' },
    { ...base, id: 'extra', amountCents: 100000n, nature: 'income', reporting: 'income', categoryId: 'extraordinary_income' },
    { ...base, id: 'market', amountCents: -50000n, categoryId: 'groceries' },
    { ...base, id: 'previous', amountCents: -90000n, categoryId: 'groceries', competence: '2026-10' }
  ];

  assert.deepEqual(categoryBudgetProgress(budget, transactions, '2026-11'), {
    incomeCents: 600000n,
    limitCents: 60000n,
    usedCents: 50000n,
    remainingCents: 10000n,
    usageBasisPoints: 8333n,
    status: 'approaching'
  });
  assert.equal(categoryBudgetProgress(budget, [...transactions, { ...transactions[0], id: 'raise', amountCents: 200000n }], '2026-11').limitCents, 60000n);
});

test('acompanha meta anual e sinaliza estouro com centavos exatos', () => {
  const budget: CategoryBudget = { id: 'b1', categoryId: 'groceries', monthlyLimitCents: 3333n };
  const transactions: TransactionContract[] = [
    { ...base, id: 'income-nov', amountCents: 500001n, nature: 'income', reporting: 'income' },
    { ...base, id: 'income-oct', amountCents: 300000n, nature: 'income', reporting: 'income', competence: '2026-10' },
    { ...base, id: 'market-nov', amountCents: -25001n, categoryId: 'groceries' },
    { ...base, id: 'market-oct', amountCents: -20000n, categoryId: 'groceries', competence: '2026-10' }
  ];
  const progress = categoryBudgetProgress(budget, transactions, '2026');

  assert.equal(progress.limitCents, 39996n);
  assert.equal(progress.usedCents, 45001n);
  assert.equal(progress.remainingCents, -5005n);
  assert.equal(progress.status, 'exceeded');
});

test('rejeita valor e período inválidos na meta', () => {
  assert.throws(() => categoryBudgetProgress({ id: 'b', categoryId: 'c', monthlyLimitCents: 0n }, [], '2026-11'), RangeError);
  assert.throws(() => categoryBudgetProgress({ id: 'b', categoryId: 'c', monthlyLimitCents: -1n }, [], '2026-11'), RangeError);
  assert.throws(() => categoryBudgetProgress({ id: 'b', categoryId: 'c', monthlyLimitCents: 100n }, [], '11/2026'), RangeError);
});

test('teto vale mesmo sem receita confirmada no período', () => {
  const progress = categoryBudgetProgress(
    { id: 'b', categoryId: 'groceries', monthlyLimitCents: 20000n },
    [{ ...base, categoryId: 'groceries' }],
    '2026-11'
  );
  assert.equal(progress.incomeCents, 0n);
  assert.equal(progress.limitCents, 20000n);
  assert.equal(progress.status, 'within');
});

test('reconstrói saldo e progresso da caixinha somente pelos movimentos vinculados', () => {
  const box: SavingsBox = { id: 'box', name: 'Reserva', openingBalanceCents: 10000n, targetCents: 100000n };
  const movements: SavingsMovement[] = [
    { id: 'm1', savingsBoxId: 'box', transactionId: 't1', type: 'contribution', amountCents: 25000n, eventDate: '2026-11-01' },
    { id: 'm2', savingsBoxId: 'box', transactionId: 't2', type: 'withdrawal', amountCents: 5000n, eventDate: '2026-11-02' }
  ];

  assert.deepEqual(savingsBoxProgress(box, movements), {
    balanceCents: 30000n,
    contributionCents: 25000n,
    withdrawalCents: 5000n,
    remainingCents: 70000n,
    progressBasisPoints: 3000n
  });
});

test('rejeita caixinha ou movimento que resulte em saldo inválido', () => {
  const box: SavingsBox = { id: 'box', name: 'Reserva', openingBalanceCents: 1000n, targetCents: 10000n };
  assert.throws(() => savingsBoxProgress({ ...box, targetCents: 0n }, []), RangeError);
  assert.throws(() => savingsBoxProgress(box, [
    { id: 'm', savingsBoxId: 'box', transactionId: 't', type: 'withdrawal', amountCents: 1001n, eventDate: '2026-11-01' }
  ]), RangeError);
});

test('aplica a semântica efetiva sem alterar o lançamento original', () => {
  const effective = applyTransactionSemantics(base, { nature: 'own_transfer', reporting: 'neutral' });

  assert.equal(base.nature, 'expense');
  assert.equal(effective.nature, 'own_transfer');
  assert.deepEqual(ledgerTotals([effective]), { incomeCents: 0n, expenseCents: 0n, netCents: 0n });
});
