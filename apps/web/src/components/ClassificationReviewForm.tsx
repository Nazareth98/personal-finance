import { useEffect, useState, type FormEvent } from 'react';
import type { TransactionContract } from '@personal-finance/domain';
import { Button, Dialog, FormMessage, Select, useToast } from '@personal-finance/ui';
import type { LedgerState } from '../ledger/useLedger';

const incomeCategories = new Set(['salary', 'other_recurring_income', 'extraordinary_income']);
const excludedExpenseCategories = new Set([...incomeCategories, 'transfers', 'savings']);

export function ClassificationReviewForm({ transaction, onClose, ledger }: {
  transaction: TransactionContract | null;
  onClose: () => void;
  ledger: LedgerState;
}) {
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { notify } = useToast();
  useEffect(() => { setCategoryId(transaction?.categoryId ?? ''); setError(''); }, [transaction]);
  const options = (ledger.data?.categories ?? []).filter(category => transaction?.nature === 'income'
    ? incomeCategories.has(category.id)
    : !excludedExpenseCategories.has(category.id)
  ).map(category => ({ value: category.id, label: category.name }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!transaction || !categoryId) { setError('Selecione a categoria confirmada.'); return; }
    setLoading(true);
    setError('');
    try {
      await ledger.confirmClassification({ transactionId: transaction.id, categoryId });
      notify({ message: 'Categoria confirmada e alias aprendido.', tone: 'success' });
      onClose();
    } catch {
      setError('Não foi possível confirmar a categoria.');
    } finally { setLoading(false); }
  }

  return <Dialog open={Boolean(transaction)} onClose={onClose} title="Confirmar categoria"
    description={transaction ? `Revise “${transaction.description}”. A confirmação ensinará um alias para ocorrências equivalentes.` : undefined}>
    <form className="transaction-form" noValidate onSubmit={submit}>
      <Select label="Categoria confirmada" value={categoryId} placeholder="Selecione" options={options} required
        onChange={event => setCategoryId(event.target.value)} />
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <div className="transaction-form__actions">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button type="submit" loading={loading}>Confirmar e aprender</Button>
      </div>
    </form>
  </Dialog>;
}
