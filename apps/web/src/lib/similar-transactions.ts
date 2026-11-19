import { normalizeClassificationText, type TransactionContract } from '@personal-finance/domain';

/** Limite da RPC `confirm_transaction_classifications`, contando o próprio lançamento. */
export const MAX_BULK_CONFIRMATIONS = 200;

/**
 * D-060: lançamentos “iguais” pelos mesmos critérios do alias aprendido no banco — importados, receita ou
 * despesa efetiva e mesma descrição normalizada (qualquer conta). Os já confirmados pelo dono ficam à parte;
 * os que já estão confirmados na categoria escolhida não mudam e saem da lista.
 */
export function similarTransactions(transaction: TransactionContract, transactions: readonly TransactionContract[], categoryId: string) {
  const key = normalizeClassificationText(transaction.description);
  const similar = key ? transactions.filter(candidate => candidate.id !== transaction.id && candidate.source === 'pluggy'
    && (candidate.nature === 'income' || candidate.nature === 'expense')
    && normalizeClassificationText(candidate.description) === key
    && !(candidate.classificationStatus === 'confirmed' && candidate.categoryId === categoryId))
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate)) : [];
  return {
    unconfirmed: similar.filter(candidate => candidate.classificationStatus !== 'confirmed'),
    confirmed: similar.filter(candidate => candidate.classificationStatus === 'confirmed')
  };
}
