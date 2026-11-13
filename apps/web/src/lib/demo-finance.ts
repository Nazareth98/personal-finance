import { totalsFromTransactions, type DemoTransaction } from './demo-transactions.ts';

export type DemoAccount = { id: string; name: string; type: 'checking' | 'savings' | 'investment'; balanceCents: bigint };
export type DemoBudget = { id: string; category: string; limitCents: bigint; usedCents: bigint };
export type DemoInvoice = { id: string; cardName: string; period: string; dueDate: string; purchasesCents: bigint; paymentsCents: bigint; status: 'open' | 'partial' | 'paid' };

export const demoAccounts: readonly DemoAccount[] = [
  { id: 'a1', name: 'Conta corrente exemplo', type: 'checking', balanceCents: 528450n },
  { id: 'a2', name: 'Reserva fictícia', type: 'savings', balanceCents: 1245900n },
  { id: 'a3', name: 'Investimentos ilustrativos', type: 'investment', balanceCents: 870000n }
];

export const demoBudgets: readonly DemoBudget[] = [
  { id: 'b1', category: 'Alimentação', limitCents: 90000n, usedCents: 62350n },
  { id: 'b2', category: 'Moradia', limitCents: 180000n, usedCents: 156990n },
  { id: 'b3', category: 'Transporte', limitCents: 40000n, usedCents: 18450n },
  { id: 'b4', category: 'Lazer', limitCents: 30000n, usedCents: 32750n }
];

export const demoInvoices: readonly DemoInvoice[] = [
  { id: 'i1', cardName: 'Cartão de exemplo', period: 'Novembro/2026', dueDate: '2026-11-20', purchasesCents: 130000n, paymentsCents: 50000n, status: 'partial' },
  { id: 'i2', cardName: 'Cartão secundário fictício', period: 'Novembro/2026', dueDate: '2026-11-25', purchasesCents: 47000n, paymentsCents: 0n, status: 'open' }
];

export function sumCents(values: readonly bigint[]): bigint {
  return values.reduce((total, amount) => total + amount, 0n);
}
export function accountsBalance(accounts: readonly DemoAccount[]): bigint {
  return sumCents(accounts.map(account => account.balanceCents));
}
export function budgetRemaining(budget: DemoBudget): bigint {
  return budget.limitCents - budget.usedCents;
}
export function budgetPercent(budget: DemoBudget): number {
  if (budget.limitCents <= 0n) return 0;
  // Only a bounded visual percentage is converted to number; no financial values are converted.
  return Number((budget.usedCents * 10000n) / budget.limitCents) / 100;
}
export function invoiceOpenCents(invoice: DemoInvoice): bigint {
  return invoice.purchasesCents > invoice.paymentsCents ? invoice.purchasesCents - invoice.paymentsCents : 0n;
}
export function monthlyReport(rows: readonly DemoTransaction[]) {
  const totals = totalsFromTransactions(rows);
  return { incomeCents: totals.income, expenseCents: totals.expense, netCents: totals.income - totals.expense };
}
export function formatSignedCents(value: bigint): string {
  return value < 0n ? formatCentsBRL(value) : '+' + formatCentsBRL(value);
}
