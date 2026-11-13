export const transactionNatures = [
  'income',
  'expense',
  'own_transfer',
  'card_payment',
  'savings_contribution',
  'savings_withdrawal',
  'adjustment'
] as const;

export type TransactionNature = typeof transactionNatures[number];
export type TransactionSource = 'manual' | 'pluggy';
export type ClassificationStatus = 'automatic' | 'suggested' | 'uncategorized' | 'confirmed';
export type TransactionReporting = 'income' | 'expense' | 'neutral';

export type FinancialAccount = {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'investment' | 'credit_card';
  openingBalanceCents: bigint;
};

export type Category = { id: string; name: string };

export type TransactionContract = {
  id: string;
  accountId: string;
  categoryId?: string;
  description: string;
  amountCents: bigint;
  nature: TransactionNature;
  reporting: TransactionReporting;
  source: TransactionSource;
  eventDate: string;
  competence: string;
  classificationStatus: ClassificationStatus;
  externalKey?: string;
};

export function validateTransaction(transaction: TransactionContract): TransactionContract {
  requireNonZeroCents(transaction.amountCents);
  if (transaction.reporting === 'income' && transaction.amountCents < 0n) {
    throw new RangeError('Receita deve aumentar o saldo.');
  }
  if (transaction.reporting === 'expense' && transaction.amountCents > 0n) {
    throw new RangeError('Despesa deve reduzir o saldo.');
  }
  if (transaction.nature !== 'adjustment') {
    const expected = transaction.nature === 'income' ? 'income' : transaction.nature === 'expense' ? 'expense' : 'neutral';
    if (transaction.reporting !== expected) throw new RangeError('Natureza e efeito financeiro incompatíveis.');
  }
  return transaction;
}

export function ledgerTotals(transactions: readonly TransactionContract[]) {
  return transactions.reduce((totals, transaction) => {
    validateTransaction(transaction);
    if (transaction.reporting === 'income') totals.incomeCents += transaction.amountCents;
    if (transaction.reporting === 'expense') totals.expenseCents += -transaction.amountCents;
    totals.netCents = totals.incomeCents - totals.expenseCents;
    return totals;
  }, { incomeCents: 0n, expenseCents: 0n, netCents: 0n });
}

export function accountBalance(account: FinancialAccount, transactions: readonly TransactionContract[]): bigint {
  return transactions
    .filter(transaction => transaction.accountId === account.id)
    .reduce((balance, transaction) => balance + requireNonZeroCents(transaction.amountCents), account.openingBalanceCents);
}

export function requireNonZeroCents(value: bigint): bigint {
  if (value === 0n) throw new RangeError('O valor financeiro não pode ser zero.');
  return value;
}

export function isConsumption(nature: TransactionNature): boolean {
  return nature === 'expense';
}
