import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSixMonthForecast, categoryBudgetProgress, recognizeItauSalary, type TransactionContract } from '../src/index.ts';

const transaction = (id: string, competence: string, amountCents: bigint, categoryId: string, reporting: 'income' | 'expense'): TransactionContract => ({
  id, accountId: 'account', categoryId, description: categoryId, amountCents,
  nature: reporting, reporting, source: 'pluggy', eventDate: `${competence}-05`, competence, classificationStatus: 'confirmed'
});

test('reconhece descrição de salário somente em instituição Itaú', () => {
  assert.equal(recognizeItauSalary('PAGTO SALARIO EMPRESA', 'Itaú Unibanco'), true);
  assert.equal(recognizeItauSalary('PIX recebido', 'Itaú Unibanco'), false);
  assert.equal(recognizeItauSalary('PAGTO SALARIO EMPRESA', 'Banco sintético'), false);
});

test('receita extraordinária altera realizado e meta, mas não a média futura', () => {
  const transactions = [
    ...['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'].map((month, index) => transaction(`salary-${index}`, month, 600000n, 'salary', 'income')),
    transaction('bonus', '2026-10', 1200000n, 'extraordinary_income', 'income')
  ];
  const forecast = buildSixMonthForecast({ transactions, budgets: [], installments: [], savingsBoxes: [], savingsMovements: [], startCompetence: '2026-11' });
  assert.equal(forecast[0].recurringIncomeCents, 600000n);
  assert.equal(categoryBudgetProgress({ id: 'budget', categoryId: 'groceries', monthlyLimitCents: 10000n }, transactions, '2026-10').incomeCents, 1800000n);
});

test('combina base recorrente, maior envelope de metas, parcelas e aporte planejado', () => {
  const transactions: TransactionContract[] = [];
  for (const [index, month] of ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'].entries()) {
    transactions.push(transaction(`salary-${index}`, month, 500000n, 'salary', 'income'));
    transactions.push(transaction(`market-${index}`, month, -100000n, 'groceries', 'expense'));
  }
  const forecast = buildSixMonthForecast({
    transactions, budgets: [{ id: 'budget', categoryId: 'groceries', monthlyLimitCents: 150000n }],
    installments: [{ id: 'future', cardId: 'card', statementId: 'statement', description: 'Notebook', number: 2, total: 2, amountCents: 50000n, dueCompetence: '2026-11', status: 'projected' }],
    savingsBoxes: [{ id: 'box', name: 'Reserva', openingBalanceCents: 0n, targetCents: 120000n, targetDate: '2027-04-30' }],
    savingsMovements: [], startCompetence: '2026-11'
  });
  assert.deepEqual(forecast[0], {
    competence: '2026-11', recurringIncomeCents: 500000n, recurringExpenseCents: 100000n,
    budgetEnvelopeCents: 150000n, plannedSpendingCents: 150000n, installmentCents: 50000n,
    plannedSavingsCents: 20000n, outflowCents: 220000n, netCents: 280000n
  });
});
