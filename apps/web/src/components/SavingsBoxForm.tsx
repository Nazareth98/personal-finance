import { useState, type FormEvent } from 'react';
import { Button, Dialog, FormMessage, Input, useToast } from '@personal-finance/ui';
import type { LedgerState } from '../ledger/useLedger';
import { parseBrlCents } from '../lib/transaction-validation';

export function SavingsBoxForm({ open, onClose, ledger }: { open: boolean; onClose: () => void; ledger: LedgerState }) {
  const [name, setName] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0,00');
  const [target, setTarget] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { notify } = useToast();

  async function submit(event: FormEvent) {
    event.preventDefault();
    const openingBalanceCents = parseBrlCents(openingBalance);
    const targetCents = parseBrlCents(target);
    if (name.trim().length < 2 || openingBalanceCents === null || targetCents === null || targetCents <= 0n) {
      setError('Informe nome, saldo inicial e uma meta maior que zero.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await ledger.createSavingsBox({ name: name.trim(), openingBalanceCents, targetCents, targetDate: targetDate || undefined });
      notify({ message: 'Caixinha cadastrada.', tone: 'success' });
      setName(''); setOpeningBalance('0,00'); setTarget(''); setTargetDate(''); onClose();
    } catch {
      setError('Não foi possível cadastrar a caixinha.');
    } finally {
      setLoading(false);
    }
  }

  return <Dialog open={open} onClose={onClose} title="Nova caixinha" description="O saldo será reconstruído pelo valor inicial e pelos movimentos vinculados.">
    <form className="transaction-form" noValidate onSubmit={submit}>
      <Input label="Nome da caixinha" value={name} maxLength={80} required onChange={event => setName(event.target.value)} />
      <Input label="Saldo inicial (R$)" inputMode="decimal" value={openingBalance} required onChange={event => setOpeningBalance(event.target.value)} />
      <Input label="Meta (R$)" inputMode="decimal" value={target} required onChange={event => setTarget(event.target.value)} />
      <Input label="Data-alvo (opcional)" type="date" value={targetDate} onChange={event => setTargetDate(event.target.value)} />
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <div className="transaction-form__actions"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" loading={loading}>Cadastrar caixinha</Button></div>
    </form>
  </Dialog>;
}
