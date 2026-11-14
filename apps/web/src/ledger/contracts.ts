import type { CardInstallment, CardStatement, CardStatementEntry, Category, CategoryBudget, CreditCard, FinancialAccount, SavingsBox, SavingsMovement, TransactionContract } from '@personal-finance/domain';

export type TransactionLink = {
  id: string;
  sourceTransactionId: string;
  targetTransactionId: string;
  type: 'own_transfer' | 'adjustment' | 'refund' | 'card_payment';
};

export type TransactionClassification = {
  id: string;
  transactionId: string;
  categoryId: string;
  confidenceBasisPoints: number;
  status: 'automatic' | 'suggested' | 'confirmed';
  classifierVersion: string;
  evidence: { kind: string; label: string; weightBasisPoints: number }[];
};

export type LedgerData = {
  accounts: FinancialAccount[];
  categories: Category[];
  budgets: CategoryBudget[];
  savingsBoxes: SavingsBox[];
  savingsMovements: SavingsMovement[];
  transactions: TransactionContract[];
  links: TransactionLink[];
  classifications: TransactionClassification[];
  creditCards: CreditCard[];
  cardStatements: CardStatement[];
  cardStatementEntries: CardStatementEntry[];
  cardInstallments: CardInstallment[];
};

export type AccountDraft = Pick<FinancialAccount, 'name' | 'type' | 'openingBalanceCents'>;
export type CategoryBudgetDraft = Pick<CategoryBudget, 'categoryId' | 'percentageBasisPoints'>;
export type SavingsBoxDraft = Pick<SavingsBox, 'name' | 'openingBalanceCents' | 'targetCents' | 'targetDate'>;
export type SavingsMovementDraft = {
  savingsBoxId: string;
  accountId: string;
  type: SavingsMovement['type'];
  description: string;
  amountCents: bigint;
  eventDate: string;
  competence: string;
};
export type SavingsMovementLinkDraft = Pick<SavingsMovement, 'savingsBoxId' | 'transactionId' | 'type'>;
export type ClassificationConfirmation = { transactionId: string; categoryId: string };
export type CreditCardConfiguration = Pick<CreditCard, 'accountId' | 'closingDay' | 'dueDay'> & { creditLimitCents?: bigint };
export type CardPaymentLink = { statementId: string; transactionId: string };

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
  createSavingsBox(draft: SavingsBoxDraft): Promise<void>;
  createSavingsMovement(draft: SavingsMovementDraft): Promise<void>;
  linkSavingsMovement(draft: SavingsMovementLinkDraft): Promise<void>;
  confirmClassification(draft: ClassificationConfirmation): Promise<void>;
  configureCreditCard(draft: CreditCardConfiguration): Promise<void>;
  linkCardPayment(draft: CardPaymentLink): Promise<void>;
}
