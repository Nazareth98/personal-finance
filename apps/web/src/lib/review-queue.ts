import type { TransactionContract } from '@personal-finance/domain';
import type { CardStatementEntry, SavingsMovement } from '@personal-finance/domain';
import type { TransactionLink, TransactionSemanticOverride } from '../ledger/contracts';

export type ReviewResolution = {
  categoryResolved: boolean;
  semanticResolved: boolean;
  pending: boolean;
};

export function reviewResolution(transaction: TransactionContract, relations: {
  semanticOverrides: readonly TransactionSemanticOverride[];
  links: readonly TransactionLink[];
  savingsMovements: readonly SavingsMovement[];
  cardStatementEntries: readonly CardStatementEntry[];
}): ReviewResolution {
  const hasOverride = relations.semanticOverrides.some(item => item.transactionId === transaction.id);
  const semanticResolved = transaction.nature === 'income' || transaction.nature === 'expense'
    ? true
    : transaction.nature === 'own_transfer'
      ? hasOverride || relations.links.some(link => link.type === 'own_transfer'
        && (link.sourceTransactionId === transaction.id || link.targetTransactionId === transaction.id))
      : transaction.nature === 'card_payment'
        ? hasOverride || relations.cardStatementEntries.some(entry => entry.type === 'payment' && entry.transactionId === transaction.id)
        : transaction.nature === 'savings_contribution' || transaction.nature === 'savings_withdrawal'
          ? hasOverride || relations.savingsMovements.some(movement => movement.transactionId === transaction.id)
          : true;
  const categoryResolved = transaction.nature === 'income' || transaction.nature === 'expense'
    ? transaction.classificationStatus === 'automatic' || transaction.classificationStatus === 'confirmed'
    : true;
  return { categoryResolved, semanticResolved, pending: !categoryResolved || !semanticResolved };
}

/** Lançamentos que passam pela revisão: importados, exceto estornos e ajustes. */
export function reviewableTransactions(transactions: readonly TransactionContract[]): TransactionContract[] {
  return transactions.filter(row => row.source === 'pluggy' && row.nature !== 'refund' && row.nature !== 'adjustment');
}

export function pendingReviewCount(transactions: readonly TransactionContract[], relations: Parameters<typeof reviewResolution>[1]): number {
  return reviewableTransactions(transactions).filter(row => reviewResolution(row, relations).pending).length;
}

export type ReviewReason = 'links' | 'categories';

/** Motivo que a fila mostra: sem o outro lado o valor contaria duas vezes, então vínculo vem antes da categoria. */
export function reviewReason(resolution: ReviewResolution): ReviewReason {
  return resolution.semanticResolved ? 'categories' : 'links';
}

/** Categoria que o “Confirmar” rápido aceitaria; só existe para sugestão ainda não confirmada. */
export function suggestedCategoryId(transaction: TransactionContract, classificationCategoryId?: string): string | undefined {
  return transaction.classificationStatus === 'suggested' ? classificationCategoryId ?? transaction.categoryId : undefined;
}
