import { useId, useState, type FormEvent } from 'react';
import { Button, DateField, Dialog, FormMessage, Input, Select, VisualSelect, useToast } from '@personal-finance/ui';
import { accountOption, categoryOption, transactionOption } from './visual-options';
import type { LedgerState } from '../ledger/useLedger';
import { parseBrlCents } from '../lib/transaction-validation';
import { natureHints } from '../lib/help-content';

type Kind = 'income' | 'expense' | 'transfer' | 'adjustment_income' | 'adjustment_expense';
type Draft = { description: string; amount: string; kind: Kind; accountId: string; targetAccountId: string; categoryId: string; adjustedTransactionId: string; eventDate: string };

function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
const blank = (): Draft => ({ description: '', amount: '', kind: 'expense', accountId: '', targetAccountId: '', categoryId: '', adjustedTransactionId: '', eventDate: localToday() });

export function ManualTransactionForm({ open, onClose, ledger }: { open: boolean; onClose: () => void; ledger: LedgerState }) {
  const [draft, setDraft] = useState<Draft>(blank);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const formId = useId();
  const { notify } = useToast();
  const data = ledger.data;
  const transfer = draft.kind === 'transfer';
  const adjustment = draft.kind.startsWith('adjustment');

  function patch<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft(current => ({ ...current, [key]: value }));
    setError('');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const amountCents = parseBrlCents(draft.amount);
    if (!data || draft.description.trim().length < 3 || !amountCents || !draft.accountId || !draft.eventDate || (!transfer && !draft.categoryId)
      || (transfer && (!draft.targetAccountId || draft.targetAccountId === draft.accountId)) || (adjustment && !draft.adjustedTransactionId)) {
      setError('Revise os campos. Transferências exigem duas contas diferentes e ajustes exigem o lançamento original.');
      return;
    }
    const reporting = transfer ? 'neutral' : draft.kind.includes('income') ? 'income' : 'expense';
    const nature: 'income' | 'expense' | 'own_transfer' | 'adjustment' = transfer ? 'own_transfer' : adjustment ? 'adjustment' : draft.kind === 'income' ? 'income' : 'expense';
    setLoading(true);
    try {
      await ledger.createTransaction({
        accountId: draft.accountId, targetAccountId: transfer ? draft.targetAccountId : undefined,
        categoryId: transfer ? undefined : draft.categoryId, adjustedTransactionId: adjustment ? draft.adjustedTransactionId : undefined,
        description: draft.description.trim(), amountCents, nature, reporting, eventDate: draft.eventDate, competence: draft.eventDate.slice(0, 7)
      });
      notify({ message: transfer ? 'Transferência conciliada nas duas contas.' : adjustment ? 'Ajuste vinculado ao lançamento original.' : 'Movimentação salva.', tone: 'success' });
      setDraft(blank());
      onClose();
    } catch {
      setError('Não foi possível salvar a movimentação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  const accountOptions = (data?.accounts ?? []).map(account => accountOption(account, data?.institutions));
  const categoryApplicability = draft.kind.includes('income') ? 'income' : 'expense';
  const categoryOptions = (data?.categories ?? [])
    .filter(category => !category.archivedAt && category.applicability === categoryApplicability)
    .map(categoryOption);
  const transactionOptions = (data?.transactions ?? []).map(transaction => transactionOption(transaction, data?.accounts ?? [], data?.institutions));

  return <Dialog open={open} onClose={onClose} title="Nova movimentação" description="Registre lançamentos manuais sem alterar dados importados."
    footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button>{accountOptions.length > 0 && <Button type="submit" form={formId} loading={loading}>Salvar</Button>}</>}>
    {!accountOptions.length ? <FormMessage tone="error">Cadastre uma conta antes de lançar movimentações.</FormMessage> : <form id={formId} onSubmit={submit} noValidate className="transaction-form">
      <Input label="Descrição" value={draft.description} maxLength={120} required onChange={event => patch('description', event.target.value)} />
      <Input label="Valor" startText="R$" inputMode="decimal" placeholder="123,45" value={draft.amount} required onChange={event => patch('amount', event.target.value)} />
      <Select label="Tipo" value={draft.kind} options={[
        { value: 'expense', label: 'Despesa' }, { value: 'income', label: 'Receita' }, { value: 'transfer', label: 'Transferência entre minhas contas' },
        { value: 'adjustment_expense', label: 'Ajuste de despesa' }, { value: 'adjustment_income', label: 'Ajuste de receita' }
      ]} hint={natureHints[draft.kind]} onChange={event => { patch('kind', event.target.value as Kind); patch('categoryId', ''); }} />
      <VisualSelect label={transfer ? 'Conta de origem' : 'Conta'} value={draft.accountId} options={accountOptions} required onChange={value => patch('accountId', value)} />
      {transfer && <VisualSelect label="Conta de destino" value={draft.targetAccountId} options={accountOptions.filter(option => option.value !== draft.accountId)} required onChange={value => patch('targetAccountId', value)} />}
      {!transfer && <VisualSelect label="Categoria" value={draft.categoryId} options={categoryOptions} searchable={categoryOptions.length > 8} required onChange={value => patch('categoryId', value)} />}
      {adjustment && <VisualSelect label="Lançamento original" value={draft.adjustedTransactionId} options={transactionOptions} searchable required onChange={value => patch('adjustedTransactionId', value)} />}
      <DateField label="Data" value={draft.eventDate} required onChange={value => patch('eventDate', value)} />
      {error && <FormMessage tone="error">{error}</FormMessage>}    </form>}
  </Dialog>;
}
