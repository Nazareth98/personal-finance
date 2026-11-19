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

export type TransactionSemanticOverride = {
  id: string;
  transactionId: string;
  nature: Extract<TransactionContract['nature'], 'income' | 'expense' | 'own_transfer' | 'card_payment' | 'savings_contribution' | 'savings_withdrawal'>;
  reporting: TransactionContract['reporting'];
  counterpartTransactionId?: string;
  statementId?: string;
  savingsBoxId?: string;
  reason: 'owner_confirmation';
  semanticVersion: 'semantics-v1';
  updatedAt: string;
};

/** Decisão substituída por uma nova revisão; a vigente continua no overlay. */
export type ReviewHistoryEntry = {
  id: string;
  transactionId: string;
  type: 'semantics' | 'classification';
  nature?: TransactionSemanticOverride['nature'];
  categoryId?: string;
  supersededAt: string;
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
  semanticOverrides: TransactionSemanticOverride[];
  reviewHistory: ReviewHistoryEntry[];
  creditCards: CreditCard[];
  cardStatements: CardStatement[];
  cardStatementEntries: CardStatementEntry[];
  cardInstallments: CardInstallment[];
};

export type AccountDraft = Pick<FinancialAccount, 'name' | 'type' | 'openingBalanceCents'>;
export type AccountUpdate = Pick<FinancialAccount, 'name' | 'openingBalanceCents'>;
export type CategoryBudgetDraft = Pick<CategoryBudget, 'categoryId' | 'monthlyLimitCents'>;
export type CategoryDraft = Pick<Category, 'name' | 'applicability' | 'iconKey' | 'colorKey'>;
export type CategoryUpdate = Pick<Category, 'name' | 'iconKey' | 'colorKey'>;
export type CategoryArchiveDraft = { categoryId: string; replacementCategoryId?: string };
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
export type SemanticConfirmation = Pick<TransactionSemanticOverride, 'transactionId' | 'nature'> & {
  counterpartTransactionId?: string;
  statementId?: string;
  savingsBoxId?: string;
  /** Conta própria sem conexão onde o outro lado da transferência será registrado. */
  counterpartAccountId?: string;
};

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
  updateAccount(accountId: string, update: AccountUpdate): Promise<void>;
  /** Arquiva a conta; os lançamentos continuam no livro. */
  archiveAccount(accountId: string): Promise<void>;
  createCategory(draft: CategoryDraft): Promise<void>;
  updateCategory(categoryId: string, update: CategoryUpdate): Promise<void>;
  moveCategory(categoryId: string, direction: -1 | 1): Promise<void>;
  archiveCategory(draft: CategoryArchiveDraft): Promise<void>;
  deleteCategory(categoryId: string): Promise<void>;
  createManualTransaction(draft: ManualTransactionDraft): Promise<void>;
  saveCategoryBudget(draft: CategoryBudgetDraft): Promise<void>;
  deleteCategoryBudget(categoryId: string): Promise<void>;
  createSavingsBox(draft: SavingsBoxDraft): Promise<void>;
  updateSavingsBox(savingsBoxId: string, draft: SavingsBoxDraft): Promise<void>;
  /** Exclui a caixinha sem histórico; com movimentos ou vínculos, arquiva. */
  deleteSavingsBox(savingsBoxId: string): Promise<'deleted' | 'archived'>;
  createSavingsMovement(draft: SavingsMovementDraft): Promise<void>;
  linkSavingsMovement(draft: SavingsMovementLinkDraft): Promise<void>;
  confirmClassification(draft: ClassificationConfirmation): Promise<void>;
  confirmTransactionSemantics(draft: SemanticConfirmation): Promise<void>;
  configureCreditCard(draft: CreditCardConfiguration): Promise<void>;
  linkCardPayment(draft: CardPaymentLink): Promise<void>;
}
