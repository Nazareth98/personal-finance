import { useState, type FormEvent } from 'react';
import { Button, Dialog, FormMessage, Input, Select, useToast } from '@personal-finance/ui';
import type { LedgerState } from '../ledger/useLedger';
import { isBudgetCategory, parsePercentageBasisPoints } from '../lib/budget-validation';

export function BudgetForm({ open, onClose, ledger }: { open: boolean; onClose: () => void; ledger: LedgerState }) {
  const [categoryId, setCategoryId] = useState('');
  const [percentage, setPercentage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { notify } = useToast();
  const options = (ledger.data?.categories ?? [])
    .filter(category => isBudgetCategory(category.id))
    .map(category => ({ value: category.id, label: category.name }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    const percentageBasisPoints = parsePercentageBasisPoints(percentage);
    if (!categoryId || percentageBasisPoints === null) {
      setError('Selecione uma categoria e informe um percentual entre 0,01% e 100%.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await ledger.saveBudget({ categoryId, percentageBasisPoints });
      notify({ message: 'Meta por categoria salva.', tone: 'success' });
      setCategoryId('');
      setPercentage('');
      onClose();
    } catch {
      setError('Não foi possível salvar a meta.');
    } finally {
      setLoading(false);
    }
  }

  return <Dialog open={open} onClose={onClose} title="Definir meta" description="O teto é recalculado sobre toda receita confirmada do período.">
    <form className="transaction-form" noValidate onSubmit={submit}>
      <Select label="Categoria" value={categoryId} placeholder="Selecione" options={options} required onChange={event => setCategoryId(event.target.value)} />
      <Input label="Percentual da receita" value={percentage} inputMode="decimal" placeholder="Ex.: 12,50" required
        hint="Use um valor entre 0,01% e 100%." onChange={event => setPercentage(event.target.value)} />
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <div className="transaction-form__actions">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button type="submit" loading={loading}>Salvar meta</Button>
      </div>
    </form>
  </Dialog>;
}
