import { useId, useState, type FormEvent } from 'react';
import { Button, Dialog, FormMessage, Input, Select, VisualSelect, useToast } from '@personal-finance/ui';
import { accountOption, transactionOption } from './visual-options';
import type { SavingsBox, SavingsMovement } from '@personal-finance/domain';
import type { LedgerState } from '../ledger/useLedger';
import { parseBrlCents } from '../lib/transaction-validation';

type MovementType = SavingsMovement['type'];
function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function SavingsMovementForm({ box, mode, onClose, ledger, initialType = 'contribution' }: {
  box: SavingsBox | null;
  mode: 'manual' | 'link';
  onClose: () => void;
  ledger: LedgerState;
  /** Aportar/Resgatar abrem o formulário já no tipo certo; monte com `key` para reiniciar. */
  initialType?: MovementType;
}) {
  const [type, setType] = useState<MovementType>(initialType);
  const [accountId, setAccountId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [eventDate, setEventDate] = useState(localToday);
  const [transactionId, setTransactionId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const formId = useId();
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

  const accountOptions = (ledger.data?.accounts ?? []).filter(account => account.type !== 'credit_card').map(account => accountOption(account, ledger.data?.institutions));
  const transactionOptions = eligibleTransactions.map(transaction => transactionOption(transaction, ledger.data?.accounts ?? [], ledger.data?.institutions));
  const title = mode === 'link' ? 'Associar lançamento importado' : type === 'withdrawal' ? 'Registrar resgate' : 'Registrar aporte';

  return <Dialog open={Boolean(box)} onClose={onClose} title={title} description={box ? `Caixinha: ${box.name}` : undefined}
    footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" form={formId} loading={loading}>Salvar</Button></>}>
    <form id={formId} className="transaction-form" noValidate onSubmit={submit}>
      <Select label="Tipo de movimento" value={type} options={[{ value: 'contribution', label: 'Aporte' }, { value: 'withdrawal', label: 'Resgate' }]}
        onChange={event => { setType(event.target.value as MovementType); setTransactionId(''); setError(''); }} />
      {mode === 'manual' ? <>
        <VisualSelect label="Conta" value={accountId} options={accountOptions} required onChange={setAccountId} />
        <Input label="Descrição" value={description} maxLength={120} required onChange={event => setDescription(event.target.value)} />
        <Input label="Valor" startText="R$" inputMode="decimal" value={amount} required onChange={event => setAmount(event.target.value)} />
        <Input label="Data" type="date" value={eventDate} required onChange={event => setEventDate(event.target.value)} />
      </> : transactionOptions.length
        ? <VisualSelect label="Lançamento importado" value={transactionId} options={transactionOptions} searchable={transactionOptions.length > 8} required onChange={setTransactionId} />
        : <FormMessage tone="hint">Nenhum lançamento importado e neutro é compatível com este tipo.</FormMessage>}
      {error && <FormMessage tone="error">{error}</FormMessage>}    </form>
  </Dialog>;
}
