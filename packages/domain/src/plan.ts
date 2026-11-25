import type { CardInstallment } from './cards.ts';
import { normalizeClassificationText } from './classification.ts';
import type { CategoryBudget, SavingsBox, SavingsMovement, TransactionContract } from './finance.ts';
import { fixedItemLastValue, type FixedItem, type FixedItemLink } from './fixed.ts';
import { buildSavingsPlans, recurringIncomeEstimate } from './forecast.ts';

/** D-084: o que já está comprometido numa categoria no mês — fixos (último valor) e parcelas de cartão. */
export type CategoryCommitment = {
  categoryId: string | null;
  fixedCents: bigint;
  installmentsCents: bigint;
  totalCents: bigint;
  items: { label: string; cents: bigint; kind: 'fixed' | 'installment' }[];
};

export type MonthPlan = {
  competence: string;
  incomeCents: bigint;
  /** `fixed`: soma dos fixos de receita; `estimate`: sem fixos de receita, média das categorias recorrentes. */
  incomeSource: 'fixed' | 'estimate';
  savingsCents: bigint;
  /** Receita prevista − aportes. */
  distributableCents: bigint;
  budgetsCents: bigint;
  /** Comprometido em categorias sem meta (entra no plano mesmo sem meta). */
  unbudgetedCommittedCents: bigint;
  /** Por categoria, o maior entre meta e comprometido; mais o comprometido sem meta. */
  plannedCents: bigint;
  /** Pode distribuir − planejado. Negativa: o mês não fecha. */
  leftoverCents: bigint;
  commitments: CategoryCommitment[];
};

export type MonthPlanInput = {
  competence: string;
  transactions: readonly TransactionContract[];
  fixedItems: readonly FixedItem[];
  fixedItemLinks: readonly FixedItemLink[];
  budgets: readonly CategoryBudget[];
  installments: readonly CardInstallment[];
  savingsBoxes: readonly SavingsBox[];
  savingsMovements: readonly SavingsMovement[];
};

const installmentKey = (item: Pick<CardInstallment, 'cardId' | 'description' | 'total' | 'amountCents'>) =>
  `${item.cardId}|${normalizeClassificationText(item.description.replace(/\d+\s*\/\s*\d+/g, ' '))}|${item.total}|${item.amountCents}`;

/**
 * Plano de uma competência (D-084): receita prevista (fixos de receita, ou estimativa), aportes, quanto se pode
 * distribuir, metas e o que já está comprometido por categoria. Metas incluem fixos: a categoria pesa o maior entre
 * a meta e o comprometido.
 */
export function buildMonthPlan(input: MonthPlanInput): MonthPlan {
  const active = input.fixedItems.filter(item => !item.endedAt);
  // Fixo de receita ainda sem lançamento vinculado não tem valor: sem nenhum com valor, vale a estimativa.
  const fixedIncomeCents = active.filter(item => item.nature === 'income')
    .reduce((sum, item) => sum + fixedItemLastValue(item.id, input.fixedItemLinks, input.transactions).cents, 0n);
  const incomeSource = fixedIncomeCents > 0n ? 'fixed' as const : 'estimate' as const;
  const incomeCents = fixedIncomeCents > 0n ? fixedIncomeCents : recurringIncomeEstimate(input.transactions, input.competence);
  const savingsCents = buildSavingsPlans(input.savingsBoxes, input.savingsMovements, input.competence)
    .filter(plan => input.competence <= plan.targetCompetence).reduce((sum, plan) => sum + plan.monthlyCents, 0n);

  const byCategory = new Map<string | null, CategoryCommitment>();
  const bucket = (categoryId: string | null) => {
    const existing = byCategory.get(categoryId);
    if (existing) return existing;
    const created: CategoryCommitment = { categoryId, fixedCents: 0n, installmentsCents: 0n, totalCents: 0n, items: [] };
    byCategory.set(categoryId, created);
    return created;
  };
  for (const item of active.filter(entry => entry.nature === 'expense')) {
    const { cents } = fixedItemLastValue(item.id, input.fixedItemLinks, input.transactions);
    if (cents <= 0n) continue;
    const target = bucket(item.categoryId ?? null);
    target.fixedCents += cents; target.totalCents += cents;
    target.items.push({ label: item.name, cents, kind: 'fixed' });
  }
  const transactionsById = new Map(input.transactions.map(transaction => [transaction.id, transaction]));
  const categoryByPurchase = new Map<string, string>();
  for (const item of input.installments) {
    const categoryId = item.transactionId ? transactionsById.get(item.transactionId)?.categoryId : undefined;
    if (categoryId) categoryByPurchase.set(installmentKey(item), categoryId);
  }
  for (const item of input.installments) {
    if (item.status === 'refunded' || item.dueCompetence !== input.competence) continue;
    const categoryId = (item.transactionId ? transactionsById.get(item.transactionId)?.categoryId : undefined)
      ?? categoryByPurchase.get(installmentKey(item)) ?? null;
    const target = bucket(categoryId);
    target.installmentsCents += item.amountCents; target.totalCents += item.amountCents;
    target.items.push({ label: `${item.description.replace(/\s*\d+\s*\/\s*\d+\s*$/, '')} (${item.number}/${item.total})`, cents: item.amountCents, kind: 'installment' });
  }

  const budgetByCategory = new Map(input.budgets.map(budget => [budget.categoryId, budget.monthlyLimitCents]));
  const budgetsCents = input.budgets.reduce((sum, budget) => sum + budget.monthlyLimitCents, 0n);
  let plannedCents = 0n;
  let unbudgetedCommittedCents = 0n;
  for (const budget of input.budgets) {
    const committed = byCategory.get(budget.categoryId)?.totalCents ?? 0n;
    plannedCents += committed > budget.monthlyLimitCents ? committed : budget.monthlyLimitCents;
  }
  for (const commitment of byCategory.values()) {
    if (commitment.categoryId !== null && budgetByCategory.has(commitment.categoryId)) continue;
    unbudgetedCommittedCents += commitment.totalCents;
  }
  plannedCents += unbudgetedCommittedCents;
  const distributableCents = incomeCents - savingsCents;
  return {
    competence: input.competence, incomeCents, incomeSource, savingsCents,
    distributableCents, budgetsCents, unbudgetedCommittedCents, plannedCents, leftoverCents: distributableCents - plannedCents,
    commitments: [...byCategory.values()].sort((a, b) => (b.totalCents > a.totalCents ? 1 : b.totalCents < a.totalCents ? -1 : 0))
  };
}
