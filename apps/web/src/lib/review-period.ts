import type { TransactionContract } from '@personal-finance/domain';
import type { LedgerData } from '../ledger/contracts';

export type ReviewPeriod = Pick<LedgerData, 'reviewStartDate'> & Partial<Pick<LedgerData, 'creditCards'>>;

export function validReviewStartDate(value: string | null): boolean {
  if (value === null) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '0001-01-01') return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Cartões entram pelo mês da fatura, inclusive compras feitas antes do início escolhido. */
export function inReviewPeriod(row: TransactionContract, period: ReviewPeriod): boolean {
  if (!period.reviewStartDate) return true;
  return period.creditCards?.some(card => card.accountId === row.accountId)
    ? row.competence >= period.reviewStartDate.slice(0, 7)
    : row.eventDate >= period.reviewStartDate;
}

/** Inclui o mês corrente; o resultado é salvo como data fixa, não recalculado ao carregar. */
export function reviewMonthStart(months: number, today = new Date()): string {
  const date = new Date(today.getFullYear(), today.getMonth() - months + 1, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
}

/** Data local de hoje (AAAA-MM-DD). */
export function todayIso(today = new Date()): string {
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

/** AAAA-MM-DD → DD/MM/AAAA, sem fuso. */
export function formatReviewDate(value: string): string {
  return value.split('-').reverse().join('/');
}
