import { useEffect, useId, useState, type FormEvent } from 'react';
import { Button, Dialog, FormMessage, Input, Select, useToast } from '@personal-finance/ui';
import type { LedgerState } from '../ledger/useLedger';
import { reviewMonthStart, validReviewStartDate } from '../lib/review-period';

export function ReviewPeriodForm({ open, onClose, onSaved, ledger }: {
  open: boolean; onClose: () => void; onSaved: () => void; ledger: LedgerState;
}) {
  const [preset, setPreset] = useState('all');
  const [date, setDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const formId = useId();
  const { notify } = useToast();

  useEffect(() => {
    if (!open) return;
    setDate(ledger.data?.reviewStartDate ?? '');
    setPreset(ledger.data?.reviewStartDate ? 'custom' : 'all');
    setError('');
  }, [open, ledger.data?.reviewStartDate]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    const value = preset === 'all' ? null : date;
    if (!validReviewStartDate(value)) { setError('Informe uma data válida.'); return; }
    setError('');
    setLoading(true);
    try {
      await ledger.setReviewStartDate(value);
      notify({ tone: 'success', message: 'Período de revisão salvo.' });
      onSaved();
      onClose();
    } catch { setError('Não foi possível salvar o período. Tente novamente.'); }
    finally { setLoading(false); }
  }

  return <Dialog open={open} onClose={() => { if (!loading) onClose(); }} title="Revisar a partir de"
    description="Escolha por onde começar. Todo o histórico continua importado e suas confirmações são preservadas."
    footer={<><Button variant="secondary" disabled={loading} onClick={onClose}>Cancelar</Button>
      <Button type="submit" form={formId} loading={loading}>Salvar</Button></>}>
    <form id={formId} className="transaction-form" noValidate onSubmit={submit}>
      <Select label="Período de revisão" value={preset} disabled={loading} options={[
        { value: 'all', label: 'Todo o histórico' }, { value: '1', label: 'Mês atual' },
        { value: '3', label: 'Últimos 3 meses' }, { value: '6', label: 'Últimos 6 meses' },
        { value: 'custom', label: 'Data personalizada' }
      ]} onChange={event => {
        const value = event.target.value;
        setPreset(value); setError('');
        if (['1', '3', '6'].includes(value)) setDate(reviewMonthStart(Number(value)));
      }}/>
      {preset !== 'all' && <Input label="Data inicial" type="date" required min="0001-01-01" max="9999-12-31"
        value={date} disabled={loading} onChange={event => { setDate(event.target.value); setPreset('custom'); setError(''); }}
        error={error === 'Informe uma data válida.' ? error : undefined}
        hint="Inclui esta data. Nos cartões, considera o mês de vencimento da fatura inteiro." />}
      <p className="muted">A data fica salva para seus próximos acessos, inclusive em outro aparelho. Novos lançamentos continuam chegando; você pode mudar o período quando quiser.</p>
      {error && error !== 'Informe uma data válida.' && <FormMessage tone="error">{error}</FormMessage>}
    </form>
  </Dialog>;
}
