import { useState, type FormEvent } from 'react';
import { Button, Dialog, FormMessage, Input, Select, useToast } from '@personal-finance/ui';
import type { FinancialAccount } from '@personal-finance/domain';
import type { LedgerState } from '../ledger/useLedger';
import { parseBrlCents } from '../lib/transaction-validation';

export function AccountForm({ open, onClose, ledger }: { open: boolean; onClose: () => void; ledger: LedgerState }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<FinancialAccount['type']>('checking');
  const [opening, setOpening] = useState('0,00');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { notify } = useToast();

  async function submit(event: FormEvent) {
    event.preventDefault();
    const negative = opening.trim().startsWith('-');
    const parsedOpening = parseBrlCents(negative ? opening.trim().slice(1) : opening);
    const openingBalanceCents = parsedOpening === null ? null : negative ? -parsedOpening : parsedOpening;
    if (name.trim().length < 2 || openingBalanceCents === null) {
      setError('Informe um nome e um saldo inicial válido.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await ledger.createAccount({ name: name.trim(), type, openingBalanceCents });
      notify({ message: 'Conta cadastrada.', tone: 'success' });
      setName(''); setOpening('0,00'); onClose();
    } catch {
      setError('Não foi possível cadastrar a conta.');
    } finally { setLoading(false); }
  }

  return <Dialog open={open} onClose={onClose} title="Nova conta" description="O saldo inicial serve como ponto de partida do livro financeiro.">
    <form onSubmit={submit} noValidate className="transaction-form">
      <Input label="Nome da conta" value={name} maxLength={80} required onChange={event => setName(event.target.value)} />
      <Select label="Tipo" value={type} options={[
        { value: 'checking', label: 'Conta corrente' }, { value: 'savings', label: 'Reserva/poupança' },
        { value: 'investment', label: 'Investimento' }, { value: 'credit_card', label: 'Cartão de crédito' }
      ]} onChange={event => setType(event.target.value as FinancialAccount['type'])} />
      <Input label="Saldo inicial (R$)" inputMode="decimal" value={opening} required onChange={event => setOpening(event.target.value)} />
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <div className="transaction-form__actions"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" loading={loading}>Cadastrar conta</Button></div>
    </form>
  </Dialog>;
}
