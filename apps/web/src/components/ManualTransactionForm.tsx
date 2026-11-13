import { useState, type FormEvent } from 'react';
import { Button, Dialog, FormMessage, Input, Select, useToast } from '@personal-finance/ui';
import type { LedgerState } from '../ledger/useLedger';
import { parseBrlCents } from '../lib/transaction-validation';
import { formatCentsBRL, formatLocalDate } from '../lib/demo-transactions';

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

  const accountOptions = (data?.accounts ?? []).map(account => ({ value: account.id, label: account.name }));
  const categoryOptions = (data?.categories ?? []).map(category => ({ value: category.id, label: category.name }));
  const transactionOptions = (data?.transactions ?? []).map(transaction => ({
    value: transaction.id, label: `${formatLocalDate(transaction.eventDate)} · ${transaction.description} · ${formatCentsBRL(transaction.amountCents < 0n ? -transaction.amountCents : transaction.amountCents)}`
  }));

  return <Dialog open={open} onClose={onClose} title="Nova movimentação" description="Registre lançamentos manuais sem alterar dados importados.">
    {!accountOptions.length ? <FormMessage tone="error">Cadastre uma conta antes de lançar movimentações.</FormMessage> : <form onSubmit={submit} noValidate className="transaction-form">
      <Input label="Descrição" value={draft.description} maxLength={120} required onChange={event => patch('description', event.target.value)} />
      <Input label="Valor (R$)" inputMode="decimal" placeholder="123,45" value={draft.amount} required onChange={event => patch('amount', event.target.value)} />
      <Select label="Tipo" value={draft.kind} options={[
        { value: 'expense', label: 'Despesa' }, { value: 'income', label: 'Receita' }, { value: 'transfer', label: 'Transferência própria' },
        { value: 'adjustment_expense', label: 'Ajuste de despesa' }, { value: 'adjustment_income', label: 'Ajuste de receita' }
      ]} onChange={event => patch('kind', event.target.value as Kind)} />
      <Select label={transfer ? 'Conta de origem' : 'Conta'} value={draft.accountId} placeholder="Selecione" options={accountOptions} required onChange={event => patch('accountId', event.target.value)} />
      {transfer && <Select label="Conta de destino" value={draft.targetAccountId} placeholder="Selecione" options={accountOptions.filter(option => option.value !== draft.accountId)} required onChange={event => patch('targetAccountId', event.target.value)} />}
      {!transfer && <Select label="Categoria" value={draft.categoryId} placeholder="Selecione" options={categoryOptions} required onChange={event => patch('categoryId', event.target.value)} />}
      {adjustment && <Select label="Lançamento original" value={draft.adjustedTransactionId} placeholder="Selecione" options={transactionOptions} required onChange={event => patch('adjustedTransactionId', event.target.value)} />}
      <Input label="Data" type="date" value={draft.eventDate} required onChange={event => patch('eventDate', event.target.value)} />
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <div className="transaction-form__actions"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" loading={loading}>Salvar movimentação</Button></div>
    </form>}
  </Dialog>;
}
