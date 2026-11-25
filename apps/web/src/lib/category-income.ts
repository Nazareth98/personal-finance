import { addCompetenceMonths, buildMonthPlan, type Category, type MonthPlanInput } from '@personal-finance/domain';

/** Uma fatia por categoria (ou caixinhas/sobra) num mês, realizada ou prevista. */
export type CategoryShare = { key: string; label: string; valueCents: bigint; color: string; fixedCents: bigint; metaCents?: bigint; muted?: boolean };
export type CategoryIncomeMonth = { competence: string; projected: boolean; incomeCents: bigint; shares: CategoryShare[] };

type Input = Omit<MonthPlanInput, 'competence' | 'today'> & { categories: readonly Category[]; today: string };

export const UNCATEGORIZED_KEY = 'uncategorized';
const SAVINGS_KEY = 'savings';
const LEFTOVER_KEY = 'leftover';
const colorOf = (category?: Category) => `var(--color-${category?.colorKey ?? 'chart-category-5'})`;
const sortByValue = (a: CategoryShare, b: CategoryShare) => (b.valueCents > a.valueCents ? 1 : b.valueCents < a.valueCents ? -1 : a.label.localeCompare(b.label, 'pt-BR'));

/**
 * D-085: despesas por categoria comparadas à receita. Meses até o atual usam o realizado (receitas, despesas e aportes
 * do livro); meses futuros usam o plano (D-084): por categoria, o maior entre meta e comprometido. A sobra é a receita
 * menos despesas e aportes (nunca negativa: o excedente aparece como despesa acima de 100%).
 */
export function categoryIncomeMonth(input: Input, competence: string): CategoryIncomeMonth {
  const categories = new Map(input.categories.map(category => [category.id, category]));
  const plan = buildMonthPlan({ ...input, competence, today: input.today });
  const fixedByCategory = new Map(plan.commitments.map(item => [item.categoryId ?? UNCATEGORIZED_KEY, item.fixedCents]));
  const metas = new Map(input.budgets.map(budget => [budget.categoryId, budget.monthlyLimitCents]));
  const projected = competence > input.today.slice(0, 7);
  const values = new Map<string, bigint>();
  let incomeCents = 0n;
  let savingsCents = 0n;
  if (projected) {
    incomeCents = plan.incomeCents;
    savingsCents = plan.savingsCents;
    for (const budget of input.budgets) {
      const committed = plan.commitments.find(item => item.categoryId === budget.categoryId)?.totalCents ?? 0n;
      values.set(budget.categoryId, committed > budget.monthlyLimitCents ? committed : budget.monthlyLimitCents);
    }
    for (const item of plan.commitments) {
      const key = item.categoryId && categories.has(item.categoryId) ? item.categoryId : UNCATEGORIZED_KEY;
      if (!values.has(key)) values.set(key, item.totalCents);
    }
  } else {
    for (const transaction of input.transactions) {
      if (transaction.competence !== competence) continue;
      if (transaction.reporting === 'income') incomeCents += transaction.amountCents;
      else if (transaction.reporting === 'expense') {
        const key = transaction.categoryId && categories.has(transaction.categoryId) ? transaction.categoryId : UNCATEGORIZED_KEY;
        values.set(key, (values.get(key) ?? 0n) - transaction.amountCents);
      } else if (transaction.nature === 'savings_contribution') savingsCents += -transaction.amountCents;
      else if (transaction.nature === 'savings_withdrawal') savingsCents -= transaction.amountCents;
    }
  }
  const shares: CategoryShare[] = [...values].filter(([, value]) => value > 0n).map(([key, valueCents]) => {
    const category = categories.get(key);
    return { key, label: category?.name ?? 'Sem categoria', valueCents, color: colorOf(category), fixedCents: fixedByCategory.get(key) ?? 0n,
      ...(metas.has(key) ? { metaCents: metas.get(key)! } : {}) };
  }).sort(sortByValue);
  if (savingsCents > 0n) shares.push({ key: SAVINGS_KEY, label: 'Caixinhas', valueCents: savingsCents, color: 'var(--color-chart-income)', fixedCents: 0n });
  const used = shares.reduce((sum, share) => sum + share.valueCents, 0n);
  if (incomeCents > used) shares.push({ key: LEFTOVER_KEY, label: 'Sobra', valueCents: incomeCents - used, color: 'var(--color-bg-subtle)', fixedCents: 0n, muted: true });
  return { competence, projected, incomeCents: incomeCents > 0n ? incomeCents : 0n, shares };
}

/** Doze meses: os seis até o atual (realizados) e os seis seguintes (previstos). Séries: as 6 maiores categorias + “Outras”. */
export function categoryIncomeYear(input: Input) {
  const current = input.today.slice(0, 7);
  const months = Array.from({ length: 12 }, (_, index) => categoryIncomeMonth(input, addCompetenceMonths(current, index - 5)));
  const totals = new Map<string, { share: CategoryShare; cents: bigint }>();
  for (const month of months) for (const share of month.shares) {
    if (share.key === LEFTOVER_KEY || share.key === SAVINGS_KEY) continue;
    const entry = totals.get(share.key) ?? { share, cents: 0n };
    entry.cents += share.valueCents;
    totals.set(share.key, entry);
  }
  const top = [...totals.values()].sort((a, b) => (b.cents > a.cents ? 1 : b.cents < a.cents ? -1 : 0)).slice(0, 6).map(entry => entry.share);
  const topKeys = new Set(top.map(share => share.key));
  const series = [...top.map(share => ({ key: share.key, label: share.label, color: share.color })),
    ...(totals.size > top.length ? [{ key: 'other', label: 'Outras', color: 'var(--color-finance-neutral)' }] : [])];
  return { series, months: months.map(month => {
    const values: Record<string, bigint> = {};
    for (const share of month.shares) {
      if (share.key === LEFTOVER_KEY || share.key === SAVINGS_KEY) continue;
      const key = topKeys.has(share.key) ? share.key : 'other';
      values[key] = (values[key] ?? 0n) + share.valueCents;
    }
    return { competence: month.competence, projected: month.projected, current: month.competence === current, incomeCents: month.incomeCents, values };
  }) };
}
