import { useId, useState, type FormEvent } from 'react';
import { Button, Dialog, FormMessage, VisualSelect, useToast } from '@personal-finance/ui';
import { transactionOption } from './visual-options';
import type { CardStatement } from '@personal-finance/domain';
import type { LedgerState } from '../ledger/useLedger';

export function CardPaymentForm({ statement, onClose, ledger }: { statement: CardStatement | null; onClose: () => void; ledger: LedgerState }) {
  const [transactionId, setTransactionId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const formId = useId();
  const { notify } = useToast();
  const linked = new Set((ledger.data?.cardStatementEntries ?? []).filter(entry => entry.type === 'payment').map(entry => entry.transactionId));
  const options = (ledger.data?.transactions ?? []).filter(transaction => transaction.nature === 'card_payment' && !linked.has(transaction.id))
    .map(transaction => transactionOption(transaction, ledger.data?.accounts ?? [], ledger.data?.institutions));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!statement || !transactionId) { setError('Selecione um pagamento de fatura.'); return; }
    setLoading(true); setError('');
    try {
      await ledger.linkCardPayment({ statementId: statement.id, transactionId });
      notify({ message: 'Pagamento vinculado sem duplicar a despesa.', tone: 'success' });
      setTransactionId(''); onClose();
    } catch { setError('Não foi possível vincular o pagamento.'); }
    finally { setLoading(false); }
  }

  return <Dialog open={Boolean(statement)} onClose={onClose} title="Vincular pagamento" description="O pagamento liquida a fatura e permanece neutro nos relatórios."
    footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" form={formId} loading={loading} disabled={!options.length}>Vincular pagamento</Button></>}>
    <form id={formId} className="transaction-form" noValidate onSubmit={submit}>
      {options.length ? <VisualSelect label="Pagamento de fatura" value={transactionId} options={options} searchable={options.length > 8} required onChange={setTransactionId} />
        : <FormMessage tone="hint">Nenhum lançamento neutro de pagamento está disponível.</FormMessage>}
      {error && <FormMessage tone="error">{error}</FormMessage>}    </form>
  </Dialog>;
}
