import { useEffect, useId, useState, type FormEvent } from 'react';
import { Button, Dialog, FormMessage, Input, RadioGroup, useToast } from '@personal-finance/ui';
import type { LedgerState } from '../ledger/useLedger';
import { formatReviewDate, reviewMonthStart, todayIso, validReviewStartDate } from '../lib/review-period';

const presets = [
  { value: '1', label: 'Este mês' },
  { value: '3', label: 'Últimos 3 meses' },
  { value: '6', label: 'Últimos 6 meses' }
] as const;

/** D-079: escolhe por onde a fila começa. Atalhos viram data fixa ao salvar. */
export function ReviewPeriodForm({ open, onClose, onSaved, ledger }: {
  open: boolean; onClose: () => void; onSaved: () => void; ledger: LedgerState;
}) {
  const [choice, setChoice] = useState('all');
  const [date, setDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const formId = useId();
  const { notify } = useToast();
  const saved = ledger.data?.reviewStartDate ?? null;

  useEffect(() => {
    if (!open) return;
    const preset = presets.find(item => reviewMonthStart(Number(item.value)) === saved);
    setChoice(saved ? preset?.value ?? 'custom' : 'all');
    setDate(saved ?? '');
    setError('');
  }, [open, saved]);

  const value = choice === 'all' ? null : choice === 'custom' ? date : reviewMonthStart(Number(choice));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    if (!validReviewStartDate(value)) { setError('Informe uma data válida.'); return; }
    if (value && value > todayIso()) { setError('Escolha hoje ou uma data passada.'); return; }
    setError('');
    setLoading(true);
    try {
      await ledger.setReviewStartDate(value);
      notify({ tone: 'success', message: value ? `Revisão a partir de ${formatReviewDate(value)}.` : 'Revisão de todo o histórico.' });
      onSaved();
      onClose();
    } catch { setError('Não foi possível salvar. Tente novamente.'); }
    finally { setLoading(false); }
  }

  const options = [
    { value: 'all', label: 'Todo o histórico' },
    ...presets.map(item => ({ value: item.value, label: `${item.label} (desde ${formatReviewDate(reviewMonthStart(Number(item.value)))})` })),
    { value: 'custom', label: 'Escolher uma data' }
  ];
  const fieldError = choice === 'custom' && error && error !== 'Não foi possível salvar. Tente novamente.' ? error : undefined;

  return <Dialog open={open} onClose={() => { if (!loading) onClose(); }} title="Revisar a partir de"
    description="A fila de revisão começa nesta data. Nada é apagado e você pode mudar quando quiser."
    footer={<><Button variant="secondary" disabled={loading} onClick={onClose}>Cancelar</Button>
      <Button type="submit" form={formId} loading={loading}>Salvar</Button></>}>
    <form id={formId} className="transaction-form" noValidate onSubmit={submit}>
      <RadioGroup legend="Começar por" name={`${formId}-period`} value={choice} options={options} disabled={loading}
        onChange={next => { setChoice(next); setError(''); if (next === 'custom' && !date) setDate(todayIso()); }}
        hint="Nos cartões, conta a fatura inteira do mês escolhido." />
      {choice === 'custom' && <Input label="Data" type="date" required max={todayIso()} value={date} disabled={loading}
        onChange={event => { setDate(event.target.value); setError(''); }} error={fieldError} />}
      {error && !fieldError && <FormMessage tone="error">{error}</FormMessage>}
    </form>
  </Dialog>;
}
