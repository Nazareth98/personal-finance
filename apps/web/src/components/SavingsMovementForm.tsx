import { useState, type FormEvent } from 'react';
import { Button, Dialog, FormMessage, Input, Select, useToast } from '@personal-finance/ui';
import type { SavingsBox, SavingsMovement } from '@personal-finance/domain';
import type { LedgerState } from '../ledger/useLedger';
import { formatCentsBRL, formatLocalDate } from '../lib/demo-transactions';
import { parseBrlCents } from '../lib/transaction-validation';

type MovementType = SavingsMovement['type'];
function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function SavingsMovementForm({ box, mode, onClose, ledger }: {
  box: SavingsBox | null;
  mode: 'manual' | 'link';
  onClose: () => void;
  ledger: LedgerState;
}) {
  const [type, setType] = useState<MovementType>('contribution');
  const [accountId, setAccountId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [eventDate, setEventDate] = useState(localToday);
  const [transactionId, setTransactionId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { notify } = useToast();
  const linked = new Set((ledger.data?.savingsMovements ?? []).map(movement => movement.transactionId));
  const eligibleTransactions = (ledger.data?.transactions ?? []).filter(transaction =>
    transaction.source === 'pluggy' && transaction.reporting === 'neutral' && !linked.has(transaction.id)
    && ['own_transfer', 'savings_contribution', 'savings_withdrawal'].includes(transaction.nature)
    && (type === 'contribution' ? transaction.amountCents < 0n : transaction.amountCents > 0n)
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!box) return;
    setError('');
    setLoading(true);
    try {
      if (mode === 'manual') {
        const amountCents = parseBrlCents(amount);
        if (!accountId || description.trim().length < 3 || !amountCents || !eventDate) {
          setError('Informe conta, descrição, valor positivo e data.');
          return;
        }
        await ledger.createSavingsMovement({
          savingsBoxId: box.id, accountId, type, description: description.trim(), amountCents,
          eventDate, competence: eventDate.slice(0, 7)
        });
      } else {
        if (!transactionId) {
          setError('Selecione um lançamento importado compatível.');
          return;
        }
        await ledger.linkSavingsMovement({ savingsBoxId: box.id, transactionId, type });
      }
      notify({ message: mode === 'manual' ? 'Movimento da caixinha registrado.' : 'Lançamento associado à caixinha.', tone: 'success' });
      setAccountId(''); setDescription(''); setAmount(''); setTransactionId(''); onClose();
    } catch {
      setError('Não foi possível registrar o movimento da caixinha.');
    } finally {
      setLoading(false);
    }
  }

  const accountOptions = (ledger.data?.accounts ?? []).filter(account => account.type !== 'credit_card').map(account => ({ value: account.id, label: account.name }));
  const transactionOptions = eligibleTransactions.map(transaction => ({
    value: transaction.id,
    label: `${formatLocalDate(transaction.eventDate)} · ${transaction.description} · ${formatCentsBRL(transaction.amountCents < 0n ? -transaction.amountCents : transaction.amountCents)}`
  }));
  const title = mode === 'manual' ? 'Registrar movimento' : 'Associar lançamento importado';

  return <Dialog open={Boolean(box)} onClose={onClose} title={title} description={box ? `Caixinha: ${box.name}` : undefined}>
    <form className="transaction-form" noValidate onSubmit={submit}>
      <Select label="Tipo de movimento" value={type} options={[{ value: 'contribution', label: 'Aporte' }, { value: 'withdrawal', label: 'Resgate' }]}
        onChange={event => { setType(event.target.value as MovementType); setTransactionId(''); setError(''); }} />
      {mode === 'manual' ? <>
        <Select label="Conta" value={accountId} placeholder="Selecione" options={accountOptions} required onChange={event => setAccountId(event.target.value)} />
        <Input label="Descrição" value={description} maxLength={120} required onChange={event => setDescription(event.target.value)} />
        <Input label="Valor (R$)" inputMode="decimal" value={amount} required onChange={event => setAmount(event.target.value)} />
        <Input label="Data" type="date" value={eventDate} required onChange={event => setEventDate(event.target.value)} />
      </> : transactionOptions.length
        ? <Select label="Lançamento importado" value={transactionId} placeholder="Selecione" options={transactionOptions} required onChange={event => setTransactionId(event.target.value)} />
        : <FormMessage tone="hint">Nenhum lançamento importado e neutro é compatível com este tipo.</FormMessage>}
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <div className="transaction-form__actions"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" loading={loading}>Salvar movimento</Button></div>
    </form>
  </Dialog>;
}
