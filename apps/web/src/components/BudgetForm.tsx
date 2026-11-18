import { useState, type FormEvent } from 'react';
import type { CategoryBudget } from '@personal-finance/domain';
import { Button, DeleteIcon, Dialog, FormMessage, Icon, Input, Select, useToast } from '@personal-finance/ui';
import type { LedgerState } from '../ledger/useLedger';
import { parsePercentageBasisPoints } from '../lib/budget-validation';

export function formatBasisPoints(value: number | bigint) {
  const basisPoints = BigInt(value);
  const decimals = basisPoints % 100n;
  return `${basisPoints / 100n}${decimals ? `,${decimals.toString().padStart(2, '0')}` : ''}%`;
}

/**
 * Cria, edita ou exclui a meta de uma categoria. Com `budget`, a categoria fica fixa
 * e a exclusão pede confirmação no próprio diálogo. Monte com `key` para reiniciar o estado.
 */
export function BudgetForm({ open, onClose, ledger, budget, initialCategoryId = '' }: {
  open: boolean; onClose: () => void; ledger: LedgerState;
  budget?: CategoryBudget; initialCategoryId?: string;
}) {
  const [categoryId, setCategoryId] = useState(budget?.categoryId ?? initialCategoryId);
  const [percentage, setPercentage] = useState(budget ? formatBasisPoints(budget.percentageBasisPoints).replace('%', '') : '');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { notify } = useToast();
  const categories = ledger.data?.categories ?? [];
  const budgeted = new Set((ledger.data?.budgets ?? []).map(item => item.categoryId));
  const categoryName = categories.find(category => category.id === budget?.categoryId)?.name ?? 'Categoria indisponível';
  const options = budget
    ? [{ value: budget.categoryId, label: categoryName }]
    : categories
      .filter(category => !category.archivedAt && category.applicability === 'expense' && !budgeted.has(category.id))
      .map(category => ({ value: category.id, label: category.name }));
  const title = budget ? `Editar meta de ${categoryName}` : 'Definir meta';

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
      notify({ message: budget ? 'Meta atualizada.' : 'Meta por categoria salva.', tone: 'success' });
      onClose();
    } catch {
      setError('Não foi possível salvar a meta.');
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!budget) return;
    setLoading(true);
    setError('');
    try {
      await ledger.deleteBudget(budget.categoryId);
      notify({ message: 'Meta excluída.', tone: 'success' });
      onClose();
    } catch {
      setError('Não foi possível excluir a meta.');
    } finally {
      setLoading(false);
    }
  }

  if (confirmingDelete) {
    return <Dialog open={open} onClose={onClose} title={`Excluir meta de ${categoryName}?`}
      description="O teto deixa de ser acompanhado. Lançamentos e a categoria não mudam, e você pode definir a meta de novo depois.">
      <div className="transaction-form">
        {error && <FormMessage tone="error">{error}</FormMessage>}
        <div className="transaction-form__actions">
          <Button variant="ghost" onClick={() => { setConfirmingDelete(false); setError(''); }}>Voltar</Button>
          <Button variant="danger" loading={loading} onClick={() => void remove()}><Icon icon={DeleteIcon} size="sm" />Excluir meta</Button>
        </div>
      </div>
    </Dialog>;
  }

  return <Dialog open={open} onClose={onClose} title={title} description="O teto é recalculado sobre toda receita confirmada do período.">
    <form className="transaction-form" noValidate onSubmit={submit}>
      <Select label="Categoria" value={categoryId} placeholder="Selecione" options={options} required disabled={Boolean(budget)}
        onChange={event => setCategoryId(event.target.value)} />
      <Input label="Percentual da receita" value={percentage} inputMode="decimal" placeholder="Ex.: 12,50" required
        hint="Use um valor entre 0,01% e 100%." onChange={event => setPercentage(event.target.value)} />
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <div className="transaction-form__actions budget-form__actions">
        {budget && <Button variant="ghost" className="budget-form__delete" onClick={() => { setConfirmingDelete(true); setError(''); }}>
          <Icon icon={DeleteIcon} size="sm" />Excluir meta</Button>}
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button type="submit" loading={loading}>Salvar meta</Button>
      </div>
    </form>
  </Dialog>;
}
