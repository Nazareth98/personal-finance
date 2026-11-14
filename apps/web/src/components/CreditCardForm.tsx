import { useEffect, useState, type FormEvent } from 'react';
import { Button, Dialog, FormMessage, Input, useToast } from '@personal-finance/ui';
import type { FinancialAccount } from '@personal-finance/domain';
import type { LedgerState } from '../ledger/useLedger';
import { parseBrlCents } from '../lib/transaction-validation';

export function CreditCardForm({ account, onClose, ledger }: { account: FinancialAccount | null; onClose: () => void; ledger: LedgerState }) {
  const configured = ledger.data?.creditCards.find(card => card.accountId === account?.id);
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [limit, setLimit] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { notify } = useToast();

  useEffect(() => {
    setClosingDay(configured ? String(configured.closingDay) : '');
    setDueDay(configured ? String(configured.dueDay) : '');
    setLimit(configured?.creditLimitCents === undefined ? '' : (Number(configured.creditLimitCents) / 100).toFixed(2).replace('.', ','));
    setError('');
  }, [account?.id, configured]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!account) return;
    const closing = Number(closingDay);
    const due = Number(dueDay);
    const creditLimitCents = limit.trim() ? parseBrlCents(limit) : undefined;
    if (!Number.isInteger(closing) || closing < 1 || closing > 31 || !Number.isInteger(due) || due < 1 || due > 31 || creditLimitCents === null) {
      setError('Informe dias entre 1 e 31 e um limite válido.');
      return;
    }
    setLoading(true); setError('');
    try {
      await ledger.configureCreditCard({ accountId: account.id, closingDay: closing, dueDay: due, ...(creditLimitCents === undefined ? {} : { creditLimitCents }) });
      notify({ message: 'Calendário do cartão salvo.', tone: 'success' });
      onClose();
    } catch { setError('Não foi possível salvar o calendário do cartão.'); }
    finally { setLoading(false); }
  }

  return <Dialog open={Boolean(account)} onClose={onClose} title="Configurar cartão" description={account ? `Defina o ciclo de ${account.name}.` : undefined}>
    <form className="transaction-form" noValidate onSubmit={submit}>
      <Input label="Dia de fechamento" inputMode="numeric" value={closingDay} required onChange={event => setClosingDay(event.target.value)} />
      <Input label="Dia de vencimento" inputMode="numeric" value={dueDay} required onChange={event => setDueDay(event.target.value)} />
      <Input label="Limite (R$)" inputMode="decimal" value={limit} hint="Opcional; não altera o saldo do livro." onChange={event => setLimit(event.target.value)} />
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <div className="transaction-form__actions"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" loading={loading}>Salvar cartão</Button></div>
    </form>
  </Dialog>;
}
