import { addCompetenceMonths, type CardInstallment } from './cards.ts';
import { normalizeClassificationText } from './classification.ts';
import { savingsBoxProgress, type CategoryBudget, type SavingsBox, type SavingsMovement, type TransactionContract } from './finance.ts';

export type ForecastMonth = {
  competence: string;
  recurringIncomeCents: bigint;
  recurringExpenseCents: bigint;
  budgetEnvelopeCents: bigint;
  plannedSpendingCents: bigint;
  installmentCents: bigint;
  plannedSavingsCents: bigint;
  outflowCents: bigint;
  netCents: bigint;
};

export type SixMonthForecastInput = {
  transactions: readonly TransactionContract[];
  budgets: readonly CategoryBudget[];
  installments: readonly CardInstallment[];
  savingsBoxes: readonly SavingsBox[];
  savingsMovements: readonly SavingsMovement[];
  startCompetence: string;
};

const recurringIncomeCategories = new Set(['salary', 'other_recurring_income']);

function validCompetence(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function recurringExpenseAverage(
  transactions: readonly TransactionContract[],
  historyPeriods: readonly string[],
  postedInstallmentTransactions: ReadonlySet<string>
): bigint {
  const history = new Set(historyPeriods);
  const groups = new Map<string, { periods: Set<string>; cents: bigint }>();
  for (const transaction of transactions) {
    if (!history.has(transaction.competence) || transaction.reporting !== 'expense' || postedInstallmentTransactions.has(transaction.id)) continue;
    if (transaction.classificationStatus !== 'confirmed' && transaction.classificationStatus !== 'automatic') continue;
    const key = transaction.categoryId ? `category:${transaction.categoryId}` : `description:${normalizeClassificationText(transaction.description)}`;
    const group = groups.get(key) ?? { periods: new Set<string>(), cents: 0n };
    group.periods.add(transaction.competence);
    group.cents += -transaction.amountCents;
    groups.set(key, group);
  }
  const total = [...groups.values()].filter(group => group.periods.size >= 2)
    .reduce((sum, group) => sum + (group.cents > 0n ? group.cents : 0n), 0n);
  return total / 6n;
}

function monthsThroughTarget(startCompetence: string, targetDate: string): number {
  const target = targetDate.slice(0, 7);
  if (!validCompetence(target) || target < startCompetence) return 0;
  const [startYear, startMonth] = startCompetence.split('-').map(Number);
  const [targetYear, targetMonth] = target.split('-').map(Number);
  return (targetYear - startYear) * 12 + targetMonth - startMonth + 1;
}

/** Quanto guardar por mês em cada caixinha com data-alvo para chegar lá, a partir de `startCompetence`. */
export function buildSavingsPlans(boxes: readonly SavingsBox[], movements: readonly SavingsMovement[], startCompetence: string) {
  return boxes.flatMap(box => {
    if (!box.targetDate) return [];
    const months = monthsThroughTarget(startCompetence, box.targetDate);
    if (!months) return [];
    const progress = savingsBoxProgress(box, movements.filter(movement => movement.savingsBoxId === box.id));
    if (progress.remainingCents === 0n) return [];
    const monthlyCents = (progress.remainingCents + BigInt(months) - 1n) / BigInt(months);
    return [{ savingsBoxId: box.id, targetCompetence: box.targetDate.slice(0, 7), monthlyCents }];
  });
}

/** Média mensal das receitas recorrentes por categoria nos seis meses anteriores a `startCompetence` (estimativa sem fixos). */
export function recurringIncomeEstimate(transactions: readonly TransactionContract[], startCompetence: string): bigint {
  const history = new Set(Array.from({ length: 6 }, (_, index) => addCompetenceMonths(startCompetence, index - 6)));
  return transactions.reduce((sum, transaction) => history.has(transaction.competence) && transaction.reporting === 'income'
    && recurringIncomeCategories.has(transaction.categoryId ?? '')
    && (transaction.classificationStatus === 'confirmed' || transaction.classificationStatus === 'automatic')
    ? sum + transaction.amountCents : sum, 0n) / 6n;
}

export function recognizeItauSalary(description: string, institutionName: string): boolean {
  const institution = normalizeClassificationText(institutionName);
  const normalized = normalizeClassificationText(description);
  if (!/(^| )itau( |$)/.test(institution)) return false;
  return /(^| )(salario|pagto salario|folha pagamento|credito salario)( |$)/.test(normalized);
}

export function buildSixMonthForecast(input: SixMonthForecastInput): ForecastMonth[] {
  if (!validCompetence(input.startCompetence)) throw new RangeError('Competência inicial da previsão inválida.');
  const historyPeriods = Array.from({ length: 6 }, (_, index) => addCompetenceMonths(input.startCompetence, index - 6));
  const history = new Set(historyPeriods);
  const recurringIncomeTotal = input.transactions.reduce((sum, transaction) =>
    history.has(transaction.competence)
      && transaction.reporting === 'income'
      && recurringIncomeCategories.has(transaction.categoryId ?? '')
      && (transaction.classificationStatus === 'confirmed' || transaction.classificationStatus === 'automatic')
      ? sum + transaction.amountCents : sum, 0n);
  const recurringIncomeCents = recurringIncomeTotal / 6n;
  const postedInstallmentTransactions = new Set(input.installments.flatMap(item => item.status === 'posted' && item.transactionId ? [item.transactionId] : []));
  const recurringExpenseCents = recurringExpenseAverage(input.transactions, historyPeriods, postedInstallmentTransactions);
  const budgetEnvelopeCents = input.budgets.reduce((sum, budget) => sum + budget.monthlyLimitCents, 0n);
  const plannedSpendingCents = recurringExpenseCents > budgetEnvelopeCents ? recurringExpenseCents : budgetEnvelopeCents;
  const savingsPlans = buildSavingsPlans(input.savingsBoxes, input.savingsMovements, input.startCompetence);
  return Array.from({ length: 6 }, (_, index) => {
    const competence = addCompetenceMonths(input.startCompetence, index);
    const installmentCents = input.installments.filter(item => item.status === 'projected' && item.dueCompetence === competence)
      .reduce((sum, item) => sum + item.amountCents, 0n);
    const plannedSavingsCents = savingsPlans.filter(plan => competence <= plan.targetCompetence)
      .reduce((sum, plan) => sum + plan.monthlyCents, 0n);
    const outflowCents = plannedSpendingCents + installmentCents + plannedSavingsCents;
    return { competence, recurringIncomeCents, recurringExpenseCents, budgetEnvelopeCents, plannedSpendingCents,
      installmentCents, plannedSavingsCents, outflowCents, netCents: recurringIncomeCents - outflowCents };
  });
}
