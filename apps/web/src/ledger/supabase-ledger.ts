import type { SupabaseClient } from '@supabase/supabase-js';
import { validateTransaction, type CategoryBudget, type FinancialAccount, type SavingsBox, type SavingsMovement, type TransactionContract } from '@personal-finance/domain';
import type { AccountDraft, CategoryBudgetDraft, LedgerData, LedgerRepository, ManualTransactionDraft, SavingsBoxDraft, SavingsMovementDraft, SavingsMovementLinkDraft, TransactionLink } from './contracts';

type AccountRow = { id: string; name: string; account_type: FinancialAccount['type']; opening_balance_cents: string | number };
type TransactionRow = {
  id: string; account_id: string; category_id: string | null; description: string; amount_cents: string | number;
  nature: TransactionContract['nature']; reporting: TransactionContract['reporting']; source: TransactionContract['source'];
  event_date: string; competence: string; classification_status: TransactionContract['classificationStatus']; external_key: string | null;
};
type LinkRow = { id: string; source_transaction_id: string; target_transaction_id: string; link_type: TransactionLink['type'] };
type BudgetRow = { id: string; category_id: string; percentage_basis_points: number };
type SavingsBoxRow = { id: string; name: string; opening_balance_cents: string | number; target_cents: string | number; target_date: string | null };
type SavingsMovementRow = { id: string; savings_box_id: string; transaction_id: string; movement_type: SavingsMovement['type']; amount_cents: string | number; event_date: string };

export class SupabaseLedgerRepository implements LedgerRepository {
  constructor(private readonly client: SupabaseClient) {}

  async load(): Promise<LedgerData> {
    const [accountsResult, categoriesResult, transactionsResult, linksResult, budgetsResult, savingsBoxesResult, savingsMovementsResult] = await Promise.all([
      this.client.from('financial_accounts').select('id,name,account_type,opening_balance_cents').is('archived_at', null).order('created_at'),
      this.client.from('categories').select('id,name').order('sort_order'),
      this.client.from('transactions').select('id,account_id,category_id,description,amount_cents,nature,reporting,source,event_date,competence,classification_status,external_key').order('event_date', { ascending: false }),
      this.client.from('transaction_links').select('id,source_transaction_id,target_transaction_id,link_type'),
      this.client.from('category_budgets').select('id,category_id,percentage_basis_points').order('created_at'),
      this.client.from('savings_boxes').select('id,name,opening_balance_cents,target_cents,target_date').is('archived_at', null).order('created_at'),
      this.client.from('savings_movements').select('id,savings_box_id,transaction_id,movement_type,amount_cents,event_date').order('event_date', { ascending: false })
    ]);
    const error = accountsResult.error ?? categoriesResult.error ?? transactionsResult.error ?? linksResult.error ?? budgetsResult.error
      ?? savingsBoxesResult.error ?? savingsMovementsResult.error;
    if (error) throw error;
    return {
      accounts: ((accountsResult.data ?? []) as AccountRow[]).map(row => ({ id: row.id, name: row.name, type: row.account_type, openingBalanceCents: BigInt(row.opening_balance_cents) })),
      categories: (categoriesResult.data ?? []).map(row => ({ id: String(row.id), name: String(row.name) })),
      budgets: ((budgetsResult.data ?? []) as BudgetRow[]).map((row): CategoryBudget => ({
        id: row.id, categoryId: row.category_id, percentageBasisPoints: row.percentage_basis_points
      })),
      savingsBoxes: ((savingsBoxesResult.data ?? []) as SavingsBoxRow[]).map((row): SavingsBox => ({
        id: row.id, name: row.name, openingBalanceCents: BigInt(row.opening_balance_cents), targetCents: BigInt(row.target_cents),
        ...(row.target_date ? { targetDate: row.target_date } : {})
      })),
      savingsMovements: ((savingsMovementsResult.data ?? []) as SavingsMovementRow[]).map((row): SavingsMovement => ({
        id: row.id, savingsBoxId: row.savings_box_id, transactionId: row.transaction_id,
        type: row.movement_type, amountCents: BigInt(row.amount_cents), eventDate: row.event_date
      })),
      transactions: ((transactionsResult.data ?? []) as TransactionRow[]).map(row => validateTransaction({
        id: row.id, accountId: row.account_id, description: row.description, amountCents: BigInt(row.amount_cents),
        ...(row.category_id ? { categoryId: row.category_id } : {}),
        nature: row.nature, reporting: row.reporting, source: row.source, eventDate: row.event_date,
        competence: row.competence, classificationStatus: row.classification_status,
        ...(row.external_key ? { externalKey: row.external_key } : {})
      })),
      links: ((linksResult.data ?? []) as LinkRow[]).map(row => ({ id: row.id, sourceTransactionId: row.source_transaction_id, targetTransactionId: row.target_transaction_id, type: row.link_type }))
    };
  }

  async createAccount(draft: AccountDraft): Promise<void> {
    const { error } = await this.client.from('financial_accounts').insert({
      name: draft.name.trim(), account_type: draft.type, opening_balance_cents: draft.openingBalanceCents.toString()
    });
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
      p_percentage_basis_points: draft.percentageBasisPoints
    });
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
}
