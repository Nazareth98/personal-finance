import { useCallback, useEffect, useState } from 'react';
import type { AccountDraft, AccountUpdate, CardPaymentLink, CategoryArchiveDraft, CategoryBudgetDraft, CategoryDraft, CategoryUpdate, ClassificationConfirmation, CreditCardConfiguration, LedgerData, LedgerRepository, ManualTransactionDraft, SavingsBoxDraft, SavingsMovementDraft, SavingsMovementLinkDraft, SemanticConfirmation } from './contracts';

export type LedgerState = {
  data: LedgerData | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string;
  reload: () => Promise<void>;
  createAccount: (draft: AccountDraft) => Promise<void>;
  updateAccount: (accountId: string, update: AccountUpdate) => Promise<void>;
  archiveAccount: (accountId: string) => Promise<void>;
  createCategory: (draft: CategoryDraft) => Promise<void>;
  updateCategory: (categoryId: string, update: CategoryUpdate) => Promise<void>;
  moveCategory: (categoryId: string, direction: -1 | 1) => Promise<void>;
  archiveCategory: (draft: CategoryArchiveDraft) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  createTransaction: (draft: ManualTransactionDraft) => Promise<void>;
  saveBudget: (draft: CategoryBudgetDraft) => Promise<void>;
  deleteBudget: (categoryId: string) => Promise<void>;
  createSavingsBox: (draft: SavingsBoxDraft) => Promise<void>;
  updateSavingsBox: (savingsBoxId: string, draft: SavingsBoxDraft) => Promise<void>;
  deleteSavingsBox: (savingsBoxId: string) => Promise<'deleted' | 'archived'>;
  createSavingsMovement: (draft: SavingsMovementDraft) => Promise<void>;
  linkSavingsMovement: (draft: SavingsMovementLinkDraft) => Promise<void>;
  confirmClassification: (draft: ClassificationConfirmation) => Promise<void>;
  confirmTransactionSemantics: (draft: SemanticConfirmation) => Promise<void>;
  configureCreditCard: (draft: CreditCardConfiguration) => Promise<void>;
  linkCardPayment: (draft: CardPaymentLink) => Promise<void>;
};

export function useLedger(repository?: LedgerRepository): LedgerState {
  const [data, setData] = useState<LedgerData | null>(null);
  const [status, setStatus] = useState<LedgerState['status']>(repository ? 'loading' : 'idle');
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!repository) return;
    setStatus('loading');
    setError('');
    try {
      setData(await repository.load());
      setStatus('success');
    } catch {
      setError('Não foi possível carregar o livro financeiro.');
      setStatus('error');
    }
  }, [repository]);

  useEffect(() => { void reload(); }, [reload]);

  async function updateAccount(accountId: string, update: AccountUpdate) {
    if (!repository) throw new Error('ledger repository missing');
    await repository.updateAccount(accountId, update);
    await reload();
  }

  async function archiveAccount(accountId: string) {
    if (!repository) throw new Error('ledger repository missing');
    await repository.archiveAccount(accountId);
    await reload();
  }

  async function createAccount(draft: AccountDraft) {
    if (!repository) throw new Error('ledger repository missing');
    await repository.createAccount(draft);
    await reload();
  }

  async function mutateCategory(action: () => Promise<void>) {
    if (!repository) throw new Error('ledger repository missing');
    await action();
    await reload();
  }

  async function createTransaction(draft: ManualTransactionDraft) {
    if (!repository) throw new Error('ledger repository missing');
    await repository.createManualTransaction(draft);
    await reload();
  }

  async function saveBudget(draft: CategoryBudgetDraft) {
    if (!repository) throw new Error('ledger repository missing');
    await repository.saveCategoryBudget(draft);
    await reload();
  }

  async function deleteBudget(categoryId: string) {
    if (!repository) throw new Error('ledger repository missing');
    await repository.deleteCategoryBudget(categoryId);
    await reload();
  }

  async function createSavingsBox(draft: SavingsBoxDraft) {
    if (!repository) throw new Error('ledger repository missing');
    await repository.createSavingsBox(draft);
    await reload();
  }

  async function updateSavingsBox(savingsBoxId: string, draft: SavingsBoxDraft) {
    if (!repository) throw new Error('ledger repository missing');
    await repository.updateSavingsBox(savingsBoxId, draft);
    await reload();
  }

  async function deleteSavingsBox(savingsBoxId: string) {
    if (!repository) throw new Error('ledger repository missing');
    const result = await repository.deleteSavingsBox(savingsBoxId);
    await reload();
    return result;
  }

  async function createSavingsMovement(draft: SavingsMovementDraft) {
    if (!repository) throw new Error('ledger repository missing');
    await repository.createSavingsMovement(draft);
    await reload();
  }

  async function linkSavingsMovement(draft: SavingsMovementLinkDraft) {
    if (!repository) throw new Error('ledger repository missing');
    await repository.linkSavingsMovement(draft);
    await reload();
  }

  async function confirmClassification(draft: ClassificationConfirmation) {
    if (!repository) throw new Error('ledger repository missing');
    await repository.confirmClassification(draft);
    await reload();
  }

  async function confirmTransactionSemantics(draft: SemanticConfirmation) {
    if (!repository) throw new Error('ledger repository missing');
    await repository.confirmTransactionSemantics(draft);
    await reload();
  }

  async function configureCreditCard(draft: CreditCardConfiguration) {
    if (!repository) throw new Error('ledger repository missing');
    await repository.configureCreditCard(draft);
    await reload();
  }

  async function linkCardPayment(draft: CardPaymentLink) {
    if (!repository) throw new Error('ledger repository missing');
    await repository.linkCardPayment(draft);
    await reload();
  }

  return {
    data, status, error, reload, createAccount, updateAccount, archiveAccount,
    createCategory: draft => mutateCategory(() => repository!.createCategory(draft)),
    updateCategory: (categoryId, update) => mutateCategory(() => repository!.updateCategory(categoryId, update)),
    moveCategory: (categoryId, direction) => mutateCategory(() => repository!.moveCategory(categoryId, direction)),
    archiveCategory: draft => mutateCategory(() => repository!.archiveCategory(draft)),
    deleteCategory: categoryId => mutateCategory(() => repository!.deleteCategory(categoryId)),
    createTransaction, saveBudget, deleteBudget, createSavingsBox, updateSavingsBox, deleteSavingsBox, createSavingsMovement, linkSavingsMovement,
    confirmClassification, confirmTransactionSemantics, configureCreditCard, linkCardPayment
  };
}
