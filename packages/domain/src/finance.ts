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

export type CategoryBudget = {
  id: string;
  categoryId: string;
  percentageBasisPoints: number;
};

export type CategoryBudgetProgress = {
  incomeCents: bigint;
  limitCents: bigint;
  usedCents: bigint;
  remainingCents: bigint;
  usageBasisPoints: bigint;
  status: 'within' | 'approaching' | 'exceeded';
};

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

export function categoryBudgetProgress(
  budget: CategoryBudget,
  transactions: readonly TransactionContract[],
  period: string
): CategoryBudgetProgress {
  if (!Number.isInteger(budget.percentageBasisPoints) || budget.percentageBasisPoints < 1 || budget.percentageBasisPoints > 10000) {
    throw new RangeError('O percentual da meta deve estar entre 0,01% e 100%.');
  }
  if (!/^\d{4}(-(0[1-9]|1[0-2]))?$/.test(period)) throw new RangeError('Período inválido.');

  const rows = transactions.filter(transaction =>
    (period.length === 4 ? transaction.competence.startsWith(`${period}-`) : transaction.competence === period)
    && (transaction.classificationStatus === 'confirmed' || transaction.classificationStatus === 'automatic')
  );
  const incomeCents = rows.reduce((total, transaction) =>
    transaction.reporting === 'income' ? total + transaction.amountCents : total, 0n);
  const usedCents = rows.reduce((total, transaction) =>
    transaction.reporting === 'expense' && transaction.categoryId === budget.categoryId
      ? total - transaction.amountCents
      : total, 0n);
  const limitCents = incomeCents * BigInt(budget.percentageBasisPoints) / 10000n;
  const remainingCents = limitCents - usedCents;
  const usageBasisPoints = limitCents > 0n ? usedCents * 10000n / limitCents : usedCents > 0n ? 10001n : 0n;
  const status = usedCents > limitCents
    ? 'exceeded'
    : limitCents > 0n && usedCents * 100n >= limitCents * 80n
      ? 'approaching'
      : 'within';

  return { incomeCents, limitCents, usedCents, remainingCents, usageBasisPoints, status };
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
