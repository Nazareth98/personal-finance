import type { TransactionContract } from '@personal-finance/domain';

export const transactionFilterKeys = ['q', 'account', 'category', 'nature'] as const;
export type TransactionFilters = Record<(typeof transactionFilterKeys)[number], string>;
/** Valor do filtro de categoria para lançamentos ainda sem categoria. */
export const UNCATEGORIZED = 'none';

export const normalizeSearch = (value: string) =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR').trim();

export function readTransactionFilters(params: URLSearchParams): TransactionFilters {
  return { q: params.get('q') ?? '', account: params.get('account') ?? '', category: params.get('category') ?? '', nature: params.get('nature') ?? '' };
}

export function hasTransactionFilters(filters: TransactionFilters): boolean {
  return transactionFilterKeys.some(key => filters[key] !== '');
}

/** Filtros vazios não restringem; a busca considera somente a descrição, sem acentos nem maiúsculas. */
export function matchesTransactionFilters(row: TransactionContract, filters: TransactionFilters): boolean {
  const search = normalizeSearch(filters.q);
  return (!search || normalizeSearch(row.description).includes(search))
    && (!filters.account || row.accountId === filters.account)
    && (!filters.category || (filters.category === UNCATEGORIZED ? !row.categoryId : row.categoryId === filters.category))
    && (!filters.nature || row.nature === filters.nature);
}
