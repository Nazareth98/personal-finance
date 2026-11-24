import { accountBalance, addCompetenceMonths, ledgerTotals, type CategoryBudgetProgress, type FinancialAccount, type TransactionContract } from '@personal-finance/domain';
import type { ColumnPoint } from '@personal-finance/ui';
import { reviewResolution, reviewableTransactions } from './review-queue.ts';
import { inReviewPeriod, type ReviewPeriod } from './review-period.ts';

export type MonthComparison = { previous: string; balanceDeltaCents: bigint; incomeDeltaCents: bigint; expenseDeltaCents: bigint };

/** Variação do mês selecionado contra o anterior; patrimônio considera só contas que não são cartão. */
export function monthComparison(transactions: readonly TransactionContract[], accounts: readonly FinancialAccount[], period: string): MonthComparison {
  const previous = addCompetenceMonths(period, -1);
  const balanceUntil = (end: string) => {
    const rows = transactions.filter(row => row.competence <= end);
    return accounts.filter(account => account.type !== 'credit_card').reduce((sum, account) => sum + accountBalance(account, rows), 0n);
  };
  const current = ledgerTotals(transactions.filter(row => row.competence === period));
  const before = ledgerTotals(transactions.filter(row => row.competence === previous));
  return {
    previous,
    balanceDeltaCents: balanceUntil(period) - balanceUntil(previous),
    incomeDeltaCents: current.incomeCents - before.incomeCents,
    expenseDeltaCents: current.expenseCents - before.expenseCents
  };
}

export type ReviewAttention = { total: number; links: number; categories: number };

export function reviewAttention(transactions: readonly TransactionContract[], relations: Parameters<typeof reviewResolution>[1] & ReviewPeriod): ReviewAttention {
  const resolutions = reviewableTransactions(transactions).filter(row => inReviewPeriod(row, relations)).map(row => reviewResolution(row, relations)).filter(item => item.pending);
  const links = resolutions.filter(item => !item.semanticResolved).length;
  return { total: resolutions.length, links, categories: resolutions.length - links };
}

/** Primeiro compromisso de cartão com valor a partir do período, já na série exibida no gráfico. */
export function nextCardCommitment<T extends ColumnPoint & { competence: string }>(series: readonly T[], period: string): T | undefined {
  return series.find(point => point.competence >= period && point.valueCents > 0n);
}

export type BudgetAttention = { exceeded: number; approaching: number; highest?: { category: string; usageBasisPoints: bigint } };

export function budgetAttention(items: readonly { category: string; progress: CategoryBudgetProgress }[]): BudgetAttention {
  const highest = [...items].sort((a, b) => a.progress.usageBasisPoints > b.progress.usageBasisPoints ? -1 : a.progress.usageBasisPoints < b.progress.usageBasisPoints ? 1 : 0)[0];
  return {
    exceeded: items.filter(item => item.progress.status === 'exceeded').length,
    approaching: items.filter(item => item.progress.status === 'approaching').length,
    ...(highest ? { highest: { category: highest.category, usageBasisPoints: highest.progress.usageBasisPoints } } : {})
  };
}
