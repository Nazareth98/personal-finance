const nonExpenseCategories = new Set(['salary', 'other_recurring_income', 'extraordinary_income', 'transfers', 'savings']);

export function isBudgetCategory(categoryId: string): boolean {
  return !nonExpenseCategories.has(categoryId);
}

