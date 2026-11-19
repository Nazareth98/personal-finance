import { categoryBudgetProgress, type Category, type CategoryBudget, type CategoryBudgetProgress, type TransactionContract } from '@personal-finance/domain';

export type BudgetStatus = CategoryBudgetProgress['status'];

/** Ritmo diário: só existe no mês corrente, quando ainda há dias pela frente. */
export type BudgetPace =
  | { kind: 'remaining'; perDayCents: bigint; days: number }
  | { kind: 'average'; perDayCents: bigint; limitPerDayCents: bigint };

export type BudgetCardView = {
  budget: CategoryBudget;
  category?: Category;
  name: string;
  progress: CategoryBudgetProgress;
  pace?: BudgetPace;
};

export type BudgetGroup = { status: BudgetStatus; items: BudgetCardView[] };

export type UnbudgetedSpend = { categoryId: string; category?: Category; name: string; spentCents: bigint };

export type BudgetPanels = {
  incomeCents: bigint;
  /** Soma dos tetos sobre a receita do período, em pontos-base; `null` sem receita confirmada. */
  committedShareBasisPoints: bigint | null;
  totalLimitCents: bigint;
  totalUsedCents: bigint;
  groups: BudgetGroup[];
  unbudgeted: UnbudgetedSpend[];
  unbudgetedTotalCents: bigint;
};

/** Ordem de leitura: o que estourou primeiro, porque é o que pede ação. */
const statusOrder: readonly BudgetStatus[] = ['exceeded', 'approaching', 'within'];

const counted = (row: TransactionContract) => row.classificationStatus === 'confirmed' || row.classificationStatus === 'automatic';
const inPeriod = (row: TransactionContract, period: string) =>
  period.length === 4 ? row.competence.startsWith(`${period}-`) : row.competence === period;

function paceFor(progress: CategoryBudgetProgress, period: string, today: string): BudgetPace | undefined {
  if (period.length !== 7 || today.slice(0, 7) !== period) return undefined;
  const [year, month] = period.split('-').map(Number) as [number, number];
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Number(today.slice(8, 10));
  if (progress.status === 'exceeded') {
    return { kind: 'average', perDayCents: progress.usedCents / BigInt(day), limitPerDayCents: progress.limitCents / BigInt(daysInMonth) };
  }
  const days = daysInMonth - day + 1;
  return { kind: 'remaining', perDayCents: progress.remainingCents / BigInt(days), days };
}

export function buildBudgetPanels({ budgets, categories, transactions, period, today }: {
  budgets: readonly CategoryBudget[];
  categories: readonly Category[];
  transactions: readonly TransactionContract[];
  period: string;
  /** Data local `AAAA-MM-DD`, usada só para o ritmo do mês corrente. */
  today: string;
}): BudgetPanels {
  const byId = new Map(categories.map(category => [category.id, category]));
  const rows = transactions.filter(row => counted(row) && inPeriod(row, period));
  const incomeCents = rows.reduce((total, row) => row.reporting === 'income' ? total + row.amountCents : total, 0n);

  const cards = budgets.map((budget): BudgetCardView => {
    const progress = categoryBudgetProgress(budget, transactions, period);
    const category = byId.get(budget.categoryId);
    return { budget, category, name: category?.name ?? 'Categoria indisponível', progress, pace: paceFor(progress, period, today) };
  });
  const groups = statusOrder
    .map(status => ({
      status,
      items: cards.filter(card => card.progress.status === status)
        .sort((a, b) => Number(b.progress.usageBasisPoints - a.progress.usageBasisPoints) || a.name.localeCompare(b.name, 'pt-BR'))
    }))
    .filter(group => group.items.length > 0);

  const budgeted = new Set(budgets.map(budget => budget.categoryId));
  const spend = new Map<string, bigint>();
  for (const row of rows) {
    if (row.reporting !== 'expense' || !row.categoryId || budgeted.has(row.categoryId)) continue;
    spend.set(row.categoryId, (spend.get(row.categoryId) ?? 0n) - row.amountCents);
  }
  const unbudgeted = [...spend]
    .filter(([, spentCents]) => spentCents > 0n)
    .map(([categoryId, spentCents]) => ({ categoryId, category: byId.get(categoryId), name: byId.get(categoryId)?.name ?? 'Categoria indisponível', spentCents }))
    .sort((a, b) => Number(b.spentCents - a.spentCents) || a.name.localeCompare(b.name, 'pt-BR'));

  const totalLimitCents = cards.reduce((total, card) => total + card.progress.limitCents, 0n);
  return {
    incomeCents,
    committedShareBasisPoints: incomeCents > 0n ? totalLimitCents * 10000n / incomeCents : null,
    totalLimitCents,
    totalUsedCents: cards.reduce((total, card) => total + card.progress.usedCents, 0n),
    groups,
    unbudgeted,
    unbudgetedTotalCents: unbudgeted.reduce((total, item) => total + item.spentCents, 0n)
  };
}
