import type { CardInstallment, CardStatement, CardStatementEntry, Category, CategoryBudget, CreditCard, FinancialAccount, FixedItem, FixedItemLink, SavingsBox, SavingsMovement, TransactionContract } from '@personal-finance/domain';

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

/** Naturezas que o proprietário confirma na Revisão. */
export type ReviewableNature = Extract<TransactionContract['nature'], 'income' | 'expense' | 'own_transfer' | 'card_payment' | 'savings_contribution' | 'savings_withdrawal'>;
export type TransactionSemanticOverride = {
  id: string;
  transactionId: string;
  /** `adjustment` só vem de regra automática (linha informativa da fatura, D-050). */
  nature: ReviewableNature | 'adjustment';
  reporting: TransactionContract['reporting'];
  counterpartTransactionId?: string;
  statementId?: string;
  savingsBoxId?: string;
  /** Automáticos (D-050) são reversíveis e nunca substituem uma decisão do proprietário. */
  reason: 'owner_confirmation' | 'auto_statement_carryover' | 'auto_card_payment_match' | 'auto_card_payment_mirror' | 'auto_self_transfer' | 'auto_card_funded_pix';
  semanticVersion: 'semantics-v1';
  updatedAt: string;
};

/** Decisão substituída por uma nova revisão; a vigente continua no overlay. */
export type ReviewHistoryEntry = {
  id: string;
  transactionId: string;
  type: 'semantics' | 'classification';
  nature?: ReviewableNature;
  categoryId?: string;
  supersededAt: string;
};

/** Instituição de uma conta conectada (D-052). Sem `connectorId`, a interface usa monograma. */
export type AccountInstitution = { accountId: string; connectorId?: number; name: string };

export type LedgerData = {
  /** Null means all history; persisted on the owner's profile. */
  reviewStartDate?: string | null;
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
  /** Opcional: ausente em demonstração ou se a consulta falhar. */
  institutions?: AccountInstitution[];
  /** D-062: nome do titular, usado para reconhecer Pix para si mesmo. */
  holderName?: string;
  /** D-084: fixos e seus vínculos; opcionais para demonstração e instâncias ainda sem a migration. */
  fixedItems?: FixedItem[];
  fixedItemLinks?: FixedItemLink[];
};

/** D-084: cria um fixo a partir de um lançamento revisado. */
export type FixedItemDraft = { transactionId: string; name: string; categoryId?: string; linkSimilar: boolean };

export type SelfTransferResult = { paired: number; neutralized: number };

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
/** `similarTransactionIds` (D-060): outros lançamentos confirmados na mesma categoria, na mesma transação. */
export type ClassificationConfirmation = { transactionId: string; categoryId: string; similarTransactionIds?: readonly string[] };
export type CreditCardConfiguration = Pick<CreditCard, 'accountId' | 'closingDay' | 'dueDay'> & { creditLimitCents?: bigint };
export type CardPaymentLink = { statementId: string; transactionId: string };
export type SemanticConfirmation = Pick<TransactionSemanticOverride, 'transactionId'> & {
  /** O proprietário nunca confirma `adjustment`: ele só vem de regra automática (D-050). */
  nature: ReviewableNature;
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
  setReviewStartDate(date: string | null): Promise<void>;
  load(): Promise<LedgerData>;
  setHolderName(name: string): Promise<SelfTransferResult>;
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
  /** D-076: marca (ou desmarca) uma fatura como paga fora do app. */
  setStatementSettled(statementId: string, settled: boolean): Promise<void>;
  /** D-084: cria o fixo e vincula o lançamento (e, se pedido, os iguais sem fixo). Devolve quantos iguais vinculou. */
  createFixedItem(draft: FixedItemDraft): Promise<number>;
  /** D-084: vincula ou, com `null`, desvincula; `applySimilar` vale para os iguais. Devolve quantos mudaram. */
  setTransactionFixedItem(transactionId: string, fixedItemId: string | null, applySimilar: boolean): Promise<number>;
}
