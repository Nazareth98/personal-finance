const nonExpenseCategories = new Set(['salary', 'other_recurring_income', 'extraordinary_income', 'transfers', 'savings']);

export function isBudgetCategory(categoryId: string): boolean {
  return !nonExpenseCategories.has(categoryId);
}

export function parsePercentageBasisPoints(value: string): number | null {
  const match = value.trim().match(/^(\d{1,3})(?:[.,](\d{1,2}))?$/);
  if (!match) return null;
  const basisPoints = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  return basisPoints >= 1 && basisPoints <= 10000 ? basisPoints : null;
}
