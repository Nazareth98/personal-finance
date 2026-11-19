import { addCompetenceMonths, type Category, type CategoryBudget, type TransactionContract } from '@personal-finance/domain';

export type CategoryFilter = 'all' | Category['applicability'];

export type CategoryRowView = {
  category: Category;
  /** Valor da competência: despesas positivas, receitas positivas, neutros pelo módulo. Só confirmados e automáticos. */
  monthCents: bigint;
  budgetCents?: bigint;
  /** Sem lançamento confirmado ou automático nas seis competências até a atual. */
  idle: boolean;
};

export type CategoryPanels = {
  custom: CategoryRowView[];
  system: CategoryRowView[];
  archived: CategoryRowView[];
  activeCount: number;
  customCount: number;
  budgetedCount: number;
  /** Despesas categorizadas da competência (mesma base das metas). */
  expenseCents: bigint;
  idleCount: number;
};

export const IDLE_WINDOW_MONTHS = 6;

const counted = (row: TransactionContract) => row.classificationStatus === 'confirmed' || row.classificationStatus === 'automatic';

export function buildCategoryPanels({ categories, budgets, transactions, month, filter, query }: {
  categories: readonly Category[]; budgets: readonly CategoryBudget[]; transactions: readonly TransactionContract[];
  month: string; filter: CategoryFilter; query: string;
}): CategoryPanels {
  const windowStart = addCompetenceMonths(month, 1 - IDLE_WINDOW_MONTHS);
  const monthTotals = new Map<string, bigint>();
  const recent = new Set<string>();
  let expenseCents = 0n;
  for (const row of transactions) {
    if (!row.categoryId || !counted(row)) continue;
    if (row.competence >= windowStart && row.competence <= month) recent.add(row.categoryId);
    if (row.competence !== month) continue;
    const magnitude = row.amountCents < 0n ? -row.amountCents : row.amountCents;
    monthTotals.set(row.categoryId, (monthTotals.get(row.categoryId) ?? 0n) + magnitude);
    if (row.reporting === 'expense') expenseCents -= row.amountCents;
  }
  const budgetBy = new Map(budgets.map(budget => [budget.categoryId, budget.monthlyLimitCents]));
  const view = (category: Category): CategoryRowView => ({
    category, monthCents: monthTotals.get(category.id) ?? 0n, budgetCents: budgetBy.get(category.id), idle: !recent.has(category.id)
  });
  const normalized = query.trim().toLocaleLowerCase('pt-BR');
  const visible = categories.filter(category => (filter === 'all' || category.applicability === filter)
    && (!normalized || category.name.toLocaleLowerCase('pt-BR').includes(normalized)));
  const active = categories.filter(category => !category.archivedAt);
  return {
    custom: visible.filter(category => category.type === 'custom' && !category.archivedAt).map(view),
    system: visible.filter(category => category.type === 'system' && !category.archivedAt).map(view),
    archived: visible.filter(category => category.archivedAt).map(view),
    activeCount: active.length,
    customCount: active.filter(category => category.type === 'custom').length,
    budgetedCount: active.filter(category => budgetBy.has(category.id)).length,
    expenseCents,
    idleCount: active.filter(category => !recent.has(category.id)).length
  };
}
