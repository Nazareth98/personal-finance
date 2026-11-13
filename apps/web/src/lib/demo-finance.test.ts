import test from 'node:test';
import assert from 'node:assert/strict';
import { accountsBalance, budgetPercent, budgetRemaining, demoAccounts, demoBudgets, demoInvoices, invoiceOpenCents, monthlyReport } from './demo-finance.ts';
import { demoTransactions } from './demo-transactions.ts';

test('somatório de contas exato em bigint', () => {
  assert.equal(accountsBalance(demoAccounts), 2644350n);
});
test('orçamento excedido preserva saldo negativo e limita cálculo visual ao percentual', () => {
  assert.equal(budgetRemaining(demoBudgets[3]), -2750n);
  assert.ok(budgetPercent(demoBudgets[3]) > 100);
});
test('pagamento parcial reduz aberto mas não representa nova despesa', () => {
  assert.equal(invoiceOpenCents(demoInvoices[0]), 80000n);
  assert.equal(invoiceOpenCents({...demoInvoices[0], paymentsCents: 140000n}), 0n);
});
test('relatório ignora transferências próprias em receita/consumo', () => {
  const report = monthlyReport(demoTransactions);
  assert.equal(report.incomeCents, 627000n);
  assert.equal(report.expenseCents, 205868n);
  assert.equal(report.netCents, 421132n);
});
