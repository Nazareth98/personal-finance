import type { Category, CategoryBudget, FinancialAccount, TransactionContract } from '@personal-finance/domain';

export type TransactionLink = {
  id: string;
  sourceTransactionId: string;
  targetTransactionId: string;
  type: 'own_transfer' | 'adjustment' | 'refund' | 'card_payment';
};

export type LedgerData = {
  accounts: FinancialAccount[];
  categories: Category[];
  budgets: CategoryBudget[];
  transactions: TransactionContract[];
  links: TransactionLink[];
};

export type AccountDraft = Pick<FinancialAccount, 'name' | 'type' | 'openingBalanceCents'>;
export type CategoryBudgetDraft = Pick<CategoryBudget, 'categoryId' | 'percentageBasisPoints'>;

export type ManualTransactionDraft = {
  accountId: string;
  targetAccountId?: string;
  categoryId?: string;
  adjustedTransactionId?: string;
  description: string;
  amountCents: bigint;
  nature: 'income' | 'expense' | 'own_transfer' | 'adjustment';
  reporting: 'income' | 'expense' | 'neutral';
  eventDate: string;
  competence: string;
};

export interface LedgerRepository {
  load(): Promise<LedgerData>;
  createAccount(draft: AccountDraft): Promise<void>;
  createManualTransaction(draft: ManualTransactionDraft): Promise<void>;
  saveCategoryBudget(draft: CategoryBudgetDraft): Promise<void>;
}
