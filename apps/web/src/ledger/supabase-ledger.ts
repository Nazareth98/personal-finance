import type { SupabaseClient } from '@supabase/supabase-js';
import { validReviewStartDate } from '../lib/review-period';
import { applyTransactionSemantics, type CardInstallment, type CardStatement, type CardStatementEntry, type Category, type CategoryBudget, type CreditCard, type FinancialAccount, type FixedItem, type FixedItemLink, type SavingsBox, type SavingsMovement, type TransactionContract } from '@personal-finance/domain';
import type { AccountDraft, AccountUpdate, CardPaymentLink, CategoryArchiveDraft, CategoryBudgetDraft, CategoryDraft, CategoryUpdate, ClassificationConfirmation, SelfTransferResult, CreditCardConfiguration, FixedItemDraft, LedgerData, LedgerRepository, ManualTransactionDraft, ReviewHistoryEntry, SavingsBoxDraft, SavingsMovementDraft, SavingsMovementLinkDraft, SemanticConfirmation, TransactionClassification, TransactionLink, TransactionSemanticOverride } from './contracts';

type AccountRow = { id: string; name: string; account_type: FinancialAccount['type']; opening_balance_cents: string | number };
type TransactionRow = {
  id: string; account_id: string; category_id: string | null; description: string; amount_cents: string | number;
  nature: TransactionContract['nature']; reporting: TransactionContract['reporting']; source: TransactionContract['source'];
  event_date: string; competence: string; classification_status: TransactionContract['classificationStatus']; external_key: string | null; occurred_at?: string | null;
  source_deleted_at: string | null;
};
type LinkRow = { id: string; source_transaction_id: string; target_transaction_id: string; link_type: TransactionLink['type'] };
type BudgetRow = { id: string; category_id: string; monthly_limit_cents: string | number };
type CategoryRow = { id: string; name: string; category_type: 'system' | 'custom'; applicability: 'income' | 'expense' | 'neutral'; icon_key: Category['iconKey']; color_key: Category['colorKey']; sort_order: number; archived_at: string | null };
type CategoryUsageRow = { category_id: string; dependency_count: number | string };
type SavingsBoxRow = { id: string; name: string; opening_balance_cents: string | number; target_cents: string | number; target_date: string | null };
type SavingsMovementRow = { id: string; savings_box_id: string; transaction_id: string; movement_type: SavingsMovement['type']; amount_cents: string | number; event_date: string };
type ClassificationRow = {
  id: string; transaction_id: string; category_id: string; confidence_basis_points: number;
  status: TransactionClassification['status']; classifier_version: string; explanation: unknown;
};
type SemanticOverrideRow = {
  id: string; transaction_id: string; effective_nature: TransactionSemanticOverride['nature'];
  effective_reporting: TransactionSemanticOverride['reporting']; counterpart_transaction_id: string | null;
  statement_id: string | null; savings_box_id: string | null; reason: TransactionSemanticOverride['reason'];
  semantic_version: TransactionSemanticOverride['semanticVersion']; updated_at: string;
};
type ReviewHistoryRow = {
  id: string; transaction_id: string; decision_type: ReviewHistoryEntry['type'];
  previous: { nature?: ReviewHistoryEntry['nature']; categoryId?: string | null }; superseded_at: string;
};
type CreditCardRow = { id: string; account_id: string; closing_day: number; due_day: number; credit_limit_cents: string | number | null; available_limit_cents?: string | number | null; limit_updated_at?: string | null };
type CardStatementRow = { id: string; card_id: string; competence: string; closing_date: string; due_date: string; settled_at?: string | null };
type CardStatementEntryRow = { id: string; statement_id: string; transaction_id: string; entry_type: CardStatementEntry['type'] };
type CardInstallmentRow = { id: string; card_id: string; statement_id: string; transaction_id: string | null; purchase_group_key: string; description: string; installment_number: number; total_installments: number; amount_cents: string | number; due_competence: string; status: CardInstallment['status'] };
const SUPABASE_PAGE_SIZE = 1000;

function classificationEvidence(value: unknown): TransactionClassification['evidence'] {
  if (!value || typeof value !== 'object') return [];
  const evidence = (value as { evidence?: unknown }).evidence;
  if (!Array.isArray(evidence)) return [];
  return evidence.flatMap(item => {
    if (!item || typeof item !== 'object') return [];
    const row = item as Record<string, unknown>;
    if (typeof row.kind !== 'string' || typeof row.label !== 'string' || typeof row.weightBasisPoints !== 'number') return [];
    return [{ kind: row.kind, label: row.label, weightBasisPoints: row.weightBasisPoints }];
  });
}

export class SupabaseLedgerRepository implements LedgerRepository {
  constructor(private readonly client: SupabaseClient) {}

  async setReviewStartDate(date: string | null): Promise<void> {
    if (!validReviewStartDate(date)) throw new Error('invalid_review_start_date');
    const result = await this.client.from('profiles').update({ review_start_date: date })
      .eq('is_owner', true).select('review_start_date').single();
    if (result.error) throw result.error;
  }

  /**
   * PostgREST devolve no máximo 1000 linhas por consulta. Tabelas que crescem com o histórico (classificações,
   * correções, itens de fatura…) passavam desse limite e chegavam cortadas: lançamentos já revisados voltavam
   * para a fila e o contador de pendências não baixava. Lê em páginas, com `id` como desempate estável.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async paged(query: () => any): Promise<{ data: unknown[]; error: null }> {
    const rows: unknown[] = [];
    for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
      const result = await query().order('id').range(from, from + SUPABASE_PAGE_SIZE - 1);
      if (result.error) throw result.error;
      rows.push(...(result.data ?? []));
      if ((result.data?.length ?? 0) < SUPABASE_PAGE_SIZE) return { data: rows, error: null };
    }
  }

  private async loadTransactions(): Promise<TransactionRow[]> {
    const rows: TransactionRow[] = [];
    for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
      const result = await this.client.from('transactions')
        .select('id,account_id,category_id,description,amount_cents,nature,reporting,source,event_date,competence,classification_status,external_key,source_deleted_at,occurred_at')
        .order('event_date', { ascending: false }).order('id')
        .range(from, from + SUPABASE_PAGE_SIZE - 1);
      if (result.error) throw result.error;
      rows.push(...((result.data ?? []) as TransactionRow[]));
      if ((result.data?.length ?? 0) < SUPABASE_PAGE_SIZE) return rows;
    }
  }

  async load(): Promise<LedgerData> {
    const [accountsResult, categoriesResult, categoryUsageResult, transactionsResult, linksResult, budgetsResult, savingsBoxesResult, savingsMovementsResult, classificationsResult, semanticOverridesResult, reviewHistoryResult, creditCardsResult, cardStatementsResult, cardStatementEntriesResult, cardInstallmentsResult] = await Promise.all([
      this.client.from('financial_accounts').select('id,name,account_type,opening_balance_cents').is('archived_at', null).order('created_at'),
      this.client.from('categories').select('id,name,category_type,applicability,icon_key,color_key,sort_order,archived_at').order('sort_order'),
      this.client.rpc('get_category_usage'),
      this.loadTransactions(),
      this.paged(() => this.client.from('transaction_links').select('id,source_transaction_id,target_transaction_id,link_type')),
      this.client.from('category_budgets').select('id,category_id,monthly_limit_cents').order('created_at'),
      this.client.from('savings_boxes').select('id,name,opening_balance_cents,target_cents,target_date').is('archived_at', null).order('created_at'),
      this.paged(() => this.client.from('savings_movements').select('id,savings_box_id,transaction_id,movement_type,amount_cents,event_date').order('event_date', { ascending: false })),
      this.paged(() => this.client.from('transaction_classifications').select('id,transaction_id,category_id,confidence_basis_points,status,classifier_version,explanation').order('updated_at', { ascending: false })),
      this.paged(() => this.client.from('transaction_semantic_overrides').select('id,transaction_id,effective_nature,effective_reporting,counterpart_transaction_id,statement_id,savings_box_id,reason,semantic_version,updated_at').order('updated_at', { ascending: false })),
      this.paged(() => this.client.from('transaction_review_history').select('id,transaction_id,decision_type,previous,superseded_at').order('superseded_at', { ascending: false })),
      this.client.from('credit_cards').select('id,account_id,closing_day,due_day,credit_limit_cents,available_limit_cents,limit_updated_at').order('created_at'),
      this.paged(() => this.client.from('card_statements').select('id,card_id,competence,closing_date,due_date,settled_at').order('due_date', { ascending: false })),
      this.paged(() => this.client.from('card_statement_entries').select('id,statement_id,transaction_id,entry_type')),
      this.paged(() => this.client.from('card_installments').select('id,card_id,statement_id,transaction_id,purchase_group_key,description,installment_number,total_installments,amount_cents,due_competence,status').order('due_competence'))
    ]);
    const error = accountsResult.error ?? categoriesResult.error ?? categoryUsageResult.error ?? linksResult.error ?? budgetsResult.error
      ?? savingsBoxesResult.error ?? savingsMovementsResult.error ?? classificationsResult.error ?? semanticOverridesResult.error ?? reviewHistoryResult.error ?? creditCardsResult.error
      ?? cardStatementsResult.error ?? cardStatementEntriesResult.error ?? cardInstallmentsResult.error;
    if (error) throw error;
    const semanticOverrideRows = (semanticOverridesResult.data ?? []) as SemanticOverrideRow[];
    const deletedTransactionIds = new Set(transactionsResult.filter(row => row.source_deleted_at).map(row => row.id));
    // O lado manual criado para completar uma transferência some junto com o lançamento importado removido.
    const orphanCounterpartIds = new Set(semanticOverrideRows
      .filter(row => deletedTransactionIds.has(row.transaction_id) && row.counterpart_transaction_id)
      .map(row => row.counterpart_transaction_id));
    const activeTransactionRows = transactionsResult.filter(row => !row.source_deleted_at
      && !(row.source === 'manual' && orphanCounterpartIds.has(row.id)));
    const activeTransactionIds = new Set(activeTransactionRows.map(row => row.id));
    const activeClassifications = ((classificationsResult.data ?? []) as ClassificationRow[])
      .filter(row => activeTransactionIds.has(row.transaction_id));
    const activeSemanticOverrides = semanticOverrideRows
      .filter(row => activeTransactionIds.has(row.transaction_id)
        && (!row.counterpart_transaction_id || activeTransactionIds.has(row.counterpart_transaction_id)));
    const activeCardEntries = ((cardStatementEntriesResult.data ?? []) as CardStatementEntryRow[])
      .filter(row => activeTransactionIds.has(row.transaction_id));
    const cardInstallmentRows = (cardInstallmentsResult.data ?? []) as CardInstallmentRow[];
    const deletedPurchaseGroups = new Set(cardInstallmentRows
      .filter(row => row.transaction_id && !activeTransactionIds.has(row.transaction_id))
      .map(row => row.purchase_group_key));
    const activeCardInstallments = cardInstallmentRows.filter(row =>
      !deletedPurchaseGroups.has(row.purchase_group_key)
      && (!row.transaction_id || activeTransactionIds.has(row.transaction_id)));
    const classifications = activeClassifications.map((row): TransactionClassification => ({
      id: row.id, transactionId: row.transaction_id, categoryId: row.category_id,
      confidenceBasisPoints: row.confidence_basis_points, status: row.status, classifierVersion: row.classifier_version,
      evidence: classificationEvidence(row.explanation)
    }));
    const classificationByTransaction = new Map(classifications.map(item => [item.transactionId, item]));
    const semanticOverrides = activeSemanticOverrides.map((row): TransactionSemanticOverride => ({
      id: row.id, transactionId: row.transaction_id, nature: row.effective_nature, reporting: row.effective_reporting,
      ...(row.counterpart_transaction_id ? { counterpartTransactionId: row.counterpart_transaction_id } : {}),
      ...(row.statement_id ? { statementId: row.statement_id } : {}),
      ...(row.savings_box_id ? { savingsBoxId: row.savings_box_id } : {}),
      reason: row.reason, semanticVersion: row.semantic_version, updatedAt: row.updated_at
    }));
    const semanticOverrideByTransaction = new Map(semanticOverrides.map(item => [item.transactionId, item]));
    const categoryUsage = new Map(((categoryUsageResult.data ?? []) as CategoryUsageRow[])
      .map(row => [row.category_id, Number(row.dependency_count)]));
    // D-052: logo/nome do banco por conta; falha aqui não impede o livro de carregar.
    const institutionsResult = await this.client.rpc('get_account_institutions');
    // D-084: fixos; falha (instância ainda sem a migration) não impede o livro de carregar.
    const [fixedItemsResult, fixedLinksResult] = await Promise.all([
      this.client.from('fixed_items').select('id,name,nature,category_id,match_key,ended_at').order('created_at'),
      this.paged(() => this.client.from('fixed_item_links').select('transaction_id,fixed_item_id,linked_by'))
    ]);
    // A preferência não pode voltar silenciosamente a todo o histórico quando a leitura falha.
    const profileResult = await this.client.from('profiles').select('holder_name,review_start_date').single();
    if (profileResult.error) throw profileResult.error;
    const holderName = profileResult.data.holder_name as string | null;
    const institutions = institutionsResult.error ? [] : ((institutionsResult.data ?? []) as { account_id: string; connector_id: number | null; institution_name: string }[])
      .map(row => ({ accountId: row.account_id, name: row.institution_name, ...(row.connector_id ? { connectorId: row.connector_id } : {}) }));
    const fixedItems = fixedItemsResult.error ? undefined : ((fixedItemsResult.data ?? []) as { id: string; name: string; nature: 'income' | 'expense'; category_id: string | null; match_key: string; ended_at: string | null }[])
      .map((row): FixedItem => ({ id: row.id, name: row.name, nature: row.nature, matchKey: row.match_key,
        ...(row.category_id ? { categoryId: row.category_id } : {}), ...(row.ended_at ? { endedAt: row.ended_at } : {}) }));
    const fixedItemLinks = fixedLinksResult.error ? undefined : ((fixedLinksResult.data ?? []) as { transaction_id: string; fixed_item_id: string; linked_by: 'owner' | 'auto_similar' }[])
      .map((row): FixedItemLink => ({ transactionId: row.transaction_id, fixedItemId: row.fixed_item_id, linkedBy: row.linked_by }));
    return {
      institutions,
      ...(fixedItems ? { fixedItems } : {}),
      ...(fixedItemLinks ? { fixedItemLinks } : {}),
      reviewStartDate: profileResult.data.review_start_date ?? null,
      ...(holderName ? { holderName } : {}),
      accounts: ((accountsResult.data ?? []) as AccountRow[]).map(row => ({ id: row.id, name: row.name, type: row.account_type, openingBalanceCents: BigInt(row.opening_balance_cents) })),
      categories: ((categoriesResult.data ?? []) as CategoryRow[]).map(row => ({
        id: row.id, name: row.name, type: row.category_type, applicability: row.applicability,
        iconKey: row.icon_key, colorKey: row.color_key,
        sortOrder: row.sort_order, ...(row.archived_at ? { archivedAt: row.archived_at } : {}),
        dependencyCount: categoryUsage.get(row.id) ?? 0
      })),
      budgets: ((budgetsResult.data ?? []) as BudgetRow[]).map((row): CategoryBudget => ({
        id: row.id, categoryId: row.category_id, monthlyLimitCents: BigInt(row.monthly_limit_cents)
      })),
      savingsBoxes: ((savingsBoxesResult.data ?? []) as SavingsBoxRow[]).map((row): SavingsBox => ({
        id: row.id, name: row.name, openingBalanceCents: BigInt(row.opening_balance_cents), targetCents: BigInt(row.target_cents),
        ...(row.target_date ? { targetDate: row.target_date } : {})
      })),
      savingsMovements: ((savingsMovementsResult.data ?? []) as SavingsMovementRow[])
        .filter(row => activeTransactionIds.has(row.transaction_id)).map((row): SavingsMovement => ({
        id: row.id, savingsBoxId: row.savings_box_id, transactionId: row.transaction_id,
        type: row.movement_type, amountCents: BigInt(row.amount_cents), eventDate: row.event_date
      })),
      transactions: activeTransactionRows.map(row => {
        const classification = classificationByTransaction.get(row.id);
        const semantics = semanticOverrideByTransaction.get(row.id);
        const neutralCategory = semantics?.nature === 'own_transfer' ? 'transfers'
          : semantics?.nature === 'savings_contribution' || semantics?.nature === 'savings_withdrawal' ? 'savings'
            : undefined;
        // Pagamento de fatura e linha informativa da fatura (D-050) não têm categoria.
        const uncategorizedSemantics = semantics?.nature === 'card_payment' || semantics?.nature === 'adjustment';
        const effectiveCategory = uncategorizedSemantics
          ? undefined
          : neutralCategory ?? classification?.categoryId ?? row.category_id ?? undefined;
        return applyTransactionSemantics({
        id: row.id, accountId: row.account_id, description: row.description, amountCents: BigInt(row.amount_cents),
        ...(effectiveCategory ? { categoryId: effectiveCategory } : {}),
        nature: row.nature, reporting: row.reporting, source: row.source, eventDate: row.event_date,
        competence: row.competence,
        classificationStatus: neutralCategory || uncategorizedSemantics ? 'confirmed' : classification?.status ?? row.classification_status,
        ...(row.external_key ? { externalKey: row.external_key } : {}),
        ...(row.occurred_at ? { occurredAt: row.occurred_at } : {})
      }, semantics ? { nature: semantics.nature, reporting: semantics.reporting } : undefined); }),
      links: ((linksResult.data ?? []) as LinkRow[])
        .filter(row => activeTransactionIds.has(row.source_transaction_id) && activeTransactionIds.has(row.target_transaction_id))
        .map(row => ({ id: row.id, sourceTransactionId: row.source_transaction_id, targetTransactionId: row.target_transaction_id, type: row.link_type })),
      classifications,
      semanticOverrides,
      reviewHistory: ((reviewHistoryResult.data ?? []) as ReviewHistoryRow[])
        .filter(row => activeTransactionIds.has(row.transaction_id)).map((row): ReviewHistoryEntry => ({
        id: row.id, transactionId: row.transaction_id, type: row.decision_type, supersededAt: row.superseded_at,
        ...(row.previous.nature ? { nature: row.previous.nature } : {}),
        ...(row.previous.categoryId ? { categoryId: row.previous.categoryId } : {})
      })),
      creditCards: ((creditCardsResult.data ?? []) as CreditCardRow[]).map((row): CreditCard => ({
        id: row.id, accountId: row.account_id, closingDay: row.closing_day, dueDay: row.due_day,
        ...(row.credit_limit_cents === null ? {} : { creditLimitCents: BigInt(row.credit_limit_cents) }),
        ...(row.available_limit_cents === null || row.available_limit_cents === undefined ? {} : { availableLimitCents: BigInt(row.available_limit_cents) }),
        ...(row.limit_updated_at ? { limitUpdatedAt: row.limit_updated_at } : {})
      })),
      cardStatements: ((cardStatementsResult.data ?? []) as CardStatementRow[]).map((row): CardStatement => ({
        id: row.id, cardId: row.card_id, competence: row.competence, closingDate: row.closing_date, dueDate: row.due_date,
        ...(row.settled_at ? { settledAt: row.settled_at } : {})
      })),
      cardStatementEntries: activeCardEntries.map((row): CardStatementEntry => ({
        id: row.id, statementId: row.statement_id, transactionId: row.transaction_id, type: row.entry_type
      })),
      cardInstallments: activeCardInstallments.map((row): CardInstallment => ({
        id: row.id, cardId: row.card_id, statementId: row.statement_id, ...(row.transaction_id ? { transactionId: row.transaction_id } : {}),
        description: row.description, number: row.installment_number, total: row.total_installments,
        amountCents: BigInt(row.amount_cents), dueCompetence: row.due_competence, status: row.status
      }))
    };
  }

  async createAccount(draft: AccountDraft): Promise<void> {
    const { error } = await this.client.from('financial_accounts').insert({
      name: draft.name.trim(), account_type: draft.type, opening_balance_cents: draft.openingBalanceCents.toString()
    });
    if (error) throw error;
  }

  async updateAccount(accountId: string, update: AccountUpdate): Promise<void> {
    const { error } = await this.client.rpc('update_financial_account', {
      p_account_id: accountId, p_name: update.name, p_opening_balance_cents: update.openingBalanceCents.toString()
    });
    if (error) throw error;
  }

  async archiveAccount(accountId: string): Promise<void> {
    const { error } = await this.client.rpc('archive_financial_account', { p_account_id: accountId });
    if (error) throw error;
  }

  async createCategory(draft: CategoryDraft): Promise<void> {
    const { error } = await this.client.rpc('create_category', {
      p_name: draft.name, p_applicability: draft.applicability, p_icon_key: draft.iconKey, p_color_key: draft.colorKey
    });
    if (error) throw error;
  }

  async updateCategory(categoryId: string, update: CategoryUpdate): Promise<void> {
    const { error } = await this.client.rpc('update_category', {
      p_category_id: categoryId, p_name: update.name, p_icon_key: update.iconKey, p_color_key: update.colorKey
    });
    if (error) throw error;
  }

  async moveCategory(categoryId: string, direction: -1 | 1): Promise<void> {
    const { error } = await this.client.rpc('move_category', { p_category_id: categoryId, p_direction: direction });
    if (error) throw error;
  }

  async archiveCategory(draft: CategoryArchiveDraft): Promise<void> {
    const { error } = await this.client.rpc('archive_category', {
      p_category_id: draft.categoryId, p_replacement_category_id: draft.replacementCategoryId ?? null
    });
    if (error) throw error;
  }

  async deleteCategory(categoryId: string): Promise<void> {
    const { error } = await this.client.rpc('delete_category', { p_category_id: categoryId });
    if (error) throw error;
  }

  async createManualTransaction(draft: ManualTransactionDraft): Promise<void> {
    const amount = draft.amountCents < 0n ? -draft.amountCents : draft.amountCents;
    if (draft.nature === 'own_transfer') {
      if (!draft.targetAccountId) throw new Error('target account required');
      const { error } = await this.client.rpc('create_manual_transfer', {
        source_account_id: draft.accountId, target_account_id: draft.targetAccountId,
        description: draft.description, amount_cents: amount.toString(), event_date: draft.eventDate, competence: draft.competence
      });
      if (error) throw error;
      return;
    }
    const signedAmount = draft.reporting === 'expense' ? -amount : amount;
    const { error } = await this.client.rpc('create_manual_transaction', {
      account_id: draft.accountId, description: draft.description, amount_cents: signedAmount.toString(),
      nature: draft.nature, reporting: draft.reporting, event_date: draft.eventDate, competence: draft.competence,
      category_id: draft.categoryId || null, adjusted_transaction_id: draft.adjustedTransactionId || null
    });
    if (error) throw error;
  }

  async saveCategoryBudget(draft: CategoryBudgetDraft): Promise<void> {
    const { error } = await this.client.rpc('set_category_budget', {
      p_category_id: draft.categoryId,
      p_monthly_limit_cents: draft.monthlyLimitCents.toString()
    });
    if (error) throw error;
  }

  async deleteCategoryBudget(categoryId: string): Promise<void> {
    const { error } = await this.client.rpc('delete_category_budget', { p_category_id: categoryId });
    if (error) throw error;
  }

  async createSavingsBox(draft: SavingsBoxDraft): Promise<void> {
    const { error } = await this.client.rpc('create_savings_box', {
      p_name: draft.name,
      p_opening_balance_cents: draft.openingBalanceCents.toString(),
      p_target_cents: draft.targetCents.toString(),
      p_target_date: draft.targetDate || null
    });
    if (error) throw error;
  }

  async updateSavingsBox(savingsBoxId: string, draft: SavingsBoxDraft): Promise<void> {
    const { error } = await this.client.rpc('update_savings_box', {
      p_savings_box_id: savingsBoxId,
      p_name: draft.name,
      p_opening_balance_cents: draft.openingBalanceCents.toString(),
      p_target_cents: draft.targetCents.toString(),
      p_target_date: draft.targetDate || null
    });
    if (error) throw error;
  }

  async deleteSavingsBox(savingsBoxId: string): Promise<'deleted' | 'archived'> {
    const { data, error } = await this.client.rpc('delete_savings_box', { p_savings_box_id: savingsBoxId });
    if (error) throw error;
    return data === 'archived' ? 'archived' : 'deleted';
  }

  async createSavingsMovement(draft: SavingsMovementDraft): Promise<void> {
    const { error } = await this.client.rpc('create_savings_movement', {
      p_savings_box_id: draft.savingsBoxId,
      p_account_id: draft.accountId,
      p_movement_type: draft.type,
      p_description: draft.description,
      p_amount_cents: draft.amountCents.toString(),
      p_event_date: draft.eventDate,
      p_competence: draft.competence
    });
    if (error) throw error;
  }

  async linkSavingsMovement(draft: SavingsMovementLinkDraft): Promise<void> {
    const { error } = await this.client.rpc('link_savings_movement', {
      p_savings_box_id: draft.savingsBoxId,
      p_transaction_id: draft.transactionId,
      p_movement_type: draft.type
    });
    if (error) throw error;
  }

  async setHolderName(name: string): Promise<SelfTransferResult> {
    const { data, error } = await this.client.rpc('set_holder_name', { p_name: name });
    if (error) throw error;
    const result = (data ?? {}) as Partial<SelfTransferResult>;
    return { paired: Number(result.paired ?? 0), neutralized: Number(result.neutralized ?? 0) };
  }

  async confirmClassification(draft: ClassificationConfirmation): Promise<void> {
    const { error } = draft.similarTransactionIds?.length
      ? await this.client.rpc('confirm_transaction_classifications', {
        p_transaction_ids: [draft.transactionId, ...draft.similarTransactionIds],
        p_category_id: draft.categoryId
      })
      : await this.client.rpc('confirm_transaction_classification', {
        p_transaction_id: draft.transactionId,
        p_category_id: draft.categoryId
      });
    if (error) throw error;
  }

  async confirmTransactionSemantics(draft: SemanticConfirmation): Promise<void> {
    const { error } = await this.client.rpc('confirm_transaction_semantics', {
      p_transaction_id: draft.transactionId,
      p_effective_nature: draft.nature,
      p_counterpart_transaction_id: draft.counterpartTransactionId ?? null,
      p_statement_id: draft.statementId ?? null,
      p_savings_box_id: draft.savingsBoxId ?? null,
      p_counterpart_account_id: draft.counterpartAccountId ?? null
    });
    if (error) throw error;
  }

  async configureCreditCard(draft: CreditCardConfiguration): Promise<void> {
    const { error } = await this.client.rpc('configure_credit_card', {
      p_account_id: draft.accountId, p_closing_day: draft.closingDay, p_due_day: draft.dueDay,
      p_credit_limit_cents: draft.creditLimitCents?.toString() ?? null
    });
    if (error) throw error;
  }

  async createFixedItem(draft: FixedItemDraft): Promise<number> {
    const { data, error } = await this.client.rpc('create_fixed_item', {
      p_transaction_id: draft.transactionId, p_name: draft.name, p_category_id: draft.categoryId ?? null, p_link_similar: draft.linkSimilar
    });
    if (error) throw error;
    return Number((data as { linkedSimilar?: number } | null)?.linkedSimilar ?? 0);
  }

  async setTransactionFixedItem(transactionId: string, fixedItemId: string | null, applySimilar: boolean): Promise<number> {
    const { data, error } = await this.client.rpc('set_transaction_fixed_item', {
      p_transaction_id: transactionId, p_fixed_item_id: fixedItemId, p_apply_similar: applySimilar
    });
    if (error) throw error;
    return Number(data ?? 0);
  }

  async setStatementSettled(statementId: string, settled: boolean): Promise<void> {
    const { error } = await this.client.rpc('set_card_statement_settled', { p_statement_id: statementId, p_settled: settled });
    if (error) throw error;
  }

  async linkCardPayment(draft: CardPaymentLink): Promise<void> {
    const { error } = await this.client.rpc('link_card_payment', {
      p_statement_id: draft.statementId, p_transaction_id: draft.transactionId
    });
    if (error) throw error;
  }
}
