import { useEffect, useState, type FormEvent } from 'react';
import type { TransactionContract } from '@personal-finance/domain';
import { Button, Dialog, FormMessage, Select, useToast } from '@personal-finance/ui';
import type { SemanticConfirmation } from '../ledger/contracts';
import type { LedgerState } from '../ledger/useLedger';
import { formatCompetence, formatDateTime, formatLocalDate } from '../lib/demo-transactions';

type ReviewNature = SemanticConfirmation['nature'];

const natureLabels: Record<ReviewNature, string> = {
  income: 'Receita', expense: 'Despesa', own_transfer: 'Transferência entre contas próprias',
  card_payment: 'Pagamento de fatura', savings_contribution: 'Aporte em caixinha', savings_withdrawal: 'Resgate de caixinha'
};

function daysApart(first: string, second: string): number {
  const utc = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.abs(utc(first) - utc(second)) / 86_400_000;
}

export function ClassificationReviewForm({ transaction, onClose, ledger }: {
  transaction: TransactionContract | null;
  onClose: () => void;
  ledger: LedgerState;
}) {
  const [nature, setNature] = useState<ReviewNature>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [relationId, setRelationId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { notify } = useToast();
  const data = ledger.data;
  const semanticOverride = data?.semanticOverrides.find(item => item.transactionId === transaction?.id);

  useEffect(() => {
    if (!transaction) return;
    setNature(transaction.nature as ReviewNature);
    setCategoryId(transaction.categoryId ?? '');
    const link = data?.links.find(item => item.type === 'own_transfer'
      && (item.sourceTransactionId === transaction.id || item.targetTransactionId === transaction.id));
    const payment = data?.cardStatementEntries.find(item => item.type === 'payment' && item.transactionId === transaction.id);
    const movement = data?.savingsMovements.find(item => item.transactionId === transaction.id);
    const counterpartId = semanticOverride?.counterpartTransactionId
      ?? (link ? (link.sourceTransactionId === transaction.id ? link.targetTransactionId : link.sourceTransactionId) : undefined);
    const counterpart = data?.transactions.find(item => item.id === counterpartId);
    setRelationId(counterpart
      ? (counterpart.source === 'manual' ? `account:${counterpart.accountId}` : `transaction:${counterpart.id}`)
      : semanticOverride?.statementId ?? semanticOverride?.savingsBoxId ?? payment?.statementId ?? movement?.savingsBoxId ?? '');
    setError('');
  }, [data, semanticOverride, transaction]);

  const natureOptions = transaction
    ? (transaction.amountCents < 0n
      ? ['expense', 'own_transfer', 'card_payment', 'savings_contribution']
      : ['income', 'own_transfer', 'savings_withdrawal'])
      .map(value => ({ value, label: natureLabels[value as ReviewNature] }))
    : [];
  const categoryOptions = (data?.categories ?? [])
    .filter(category => !category.archivedAt && category.applicability === nature)
    .map(category => ({ value: category.id, label: category.name }));
  const counterpartOptions = transaction ? (data?.transactions ?? []).filter(candidate =>
    candidate.id !== transaction.id && candidate.source === 'pluggy' && candidate.accountId !== transaction.accountId
    && candidate.amountCents + transaction.amountCents === 0n && daysApart(candidate.eventDate, transaction.eventDate) <= 3
  ).map(candidate => ({
    value: `transaction:${candidate.id}`,
    label: `${candidate.description} · ${data?.accounts.find(account => account.id === candidate.accountId)?.name ?? 'Conta'} · ${formatLocalDate(candidate.eventDate)}`
  })) : [];
  // Conta conectada receberá o próprio lado pela importação; registrar outro duplicaria o saldo.
  const connectedAccountIds = new Set((data?.transactions ?? []).filter(item => item.source === 'pluggy').map(item => item.accountId));
  const counterpartAccountOptions = transaction ? (data?.accounts ?? []).filter(account =>
    account.id !== transaction.accountId && account.type !== 'credit_card' && !connectedAccountIds.has(account.id)
  ).map(account => ({
    value: `account:${account.id}`,
    label: `Registrar ${transaction.amountCents < 0n ? 'entrada' : 'saída'} em ${account.name}`
  })) : [];
  const categoryNames = new Map((data?.categories ?? []).map(category => [category.id, category.name]));
  const previousVersions = (data?.reviewHistory ?? []).filter(item => item.transactionId === transaction?.id);
  const statementOptions = (data?.cardStatements ?? []).map(statement => {
    const card = data?.creditCards.find(item => item.id === statement.cardId);
    const account = data?.accounts.find(item => item.id === card?.accountId);
    return { value: statement.id, label: `${account?.name ?? 'Cartão'} · ${formatCompetence(statement.competence)}` };
  });
  const savingsOptions = (data?.savingsBoxes ?? []).map(box => ({ value: box.id, label: box.name }));
  const relation = nature === 'own_transfer'
    ? { label: 'Outro lado da transferência', placeholder: 'Selecione o lançamento ou a conta de destino',
      options: [...counterpartOptions, ...counterpartAccountOptions] }
    : nature === 'card_payment'
      ? { label: 'Fatura paga', placeholder: 'Selecione a fatura', options: statementOptions }
      : nature === 'savings_contribution' || nature === 'savings_withdrawal'
        ? { label: 'Caixinha', placeholder: 'Selecione a caixinha', options: savingsOptions }
        : null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!transaction) return;
    if ((nature === 'income' || nature === 'expense') && !categoryId) {
      setError('Selecione a categoria confirmada.'); return;
    }
    if (relation && !relationId) {
      setError(`Selecione ${nature === 'own_transfer' ? 'o outro lado da transferência' : nature === 'card_payment' ? 'a fatura' : 'a caixinha'}.`); return;
    }
    setLoading(true);
    setError('');
    try {
      if ((nature !== 'income' && nature !== 'expense') || nature !== transaction.nature) {
        await ledger.confirmTransactionSemantics({
          transactionId: transaction.id, nature,
          ...(nature === 'own_transfer' && relationId.startsWith('transaction:') ? { counterpartTransactionId: relationId.slice('transaction:'.length) } : {}),
          ...(nature === 'own_transfer' && relationId.startsWith('account:') ? { counterpartAccountId: relationId.slice('account:'.length) } : {}),
          ...(nature === 'card_payment' ? { statementId: relationId } : {}),
          ...(nature === 'savings_contribution' || nature === 'savings_withdrawal' ? { savingsBoxId: relationId } : {})
        });
      }
      if (nature === 'income' || nature === 'expense') {
        await ledger.confirmClassification({ transactionId: transaction.id, categoryId });
      }
      notify({ message: nature === 'income' || nature === 'expense'
        ? 'Revisão confirmada e alias aprendido.'
        : 'Natureza e vínculo confirmados.', tone: 'success' });
      onClose();
    } catch {
      setError('Não foi possível confirmar a revisão. Confira o vínculo e tente novamente.');
    } finally { setLoading(false); }
  }

  return <Dialog open={Boolean(transaction)} onClose={onClose} title="Revisar lançamento"
    description={transaction ? `Defina o efeito financeiro de “${transaction.description}”. O registro importado não será alterado.` : undefined}>
    <form className="transaction-form" noValidate onSubmit={submit}>
      <Select label="Natureza financeira" value={nature} options={natureOptions} required
        onChange={event => { setNature(event.target.value as ReviewNature); setCategoryId(''); setRelationId(''); setError(''); }} />
      {(nature === 'income' || nature === 'expense') && <Select label="Categoria confirmada" value={categoryId}
        placeholder="Selecione" options={categoryOptions} required onChange={event => setCategoryId(event.target.value)} />}
      {relation && <Select label={relation.label} value={relationId} placeholder={relation.placeholder}
        options={relation.options} required onChange={event => setRelationId(event.target.value)} />}
      {previousVersions.length > 0 && <section className="review-versions" aria-label="Versões anteriores">
        <p className="muted">Versões anteriores ({previousVersions.length}) — preservadas ao confirmar uma nova revisão.</p>
        <ul>{previousVersions.map(item => <li key={item.id}>
          {formatDateTime(item.supersededAt)} · {item.type === 'semantics'
            ? `Natureza: ${item.nature ? natureLabels[item.nature] : 'Não informada'}`
            : `Categoria: ${item.categoryId ? categoryNames.get(item.categoryId) ?? 'Categoria removida' : 'Sem categoria'}`}
        </li>)}</ul>
      </section>}
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <div data-dialog-actions className="transaction-form__actions">
        <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button type="submit" loading={loading}>Confirmar revisão</Button>
      </div>
    </form>
  </Dialog>;
}
