import { useEffect, useId, useState, type FormEvent } from 'react';
import { Button, Dialog, FormMessage, Input, useToast } from '@personal-finance/ui';
import type { LedgerState } from '../ledger/useLedger';

/**
 * D-062: nome do titular. Pix com nome e sobrenome dele viram transferência própria (com o outro lado numa conta
 * conectada) ou neutros (conta fora do app); salvar aplica a regra também ao histórico.
 */
export function HolderNameForm({ open, onClose, ledger }: { open: boolean; onClose: () => void; ledger: LedgerState }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const formId = useId();
  const { notify } = useToast();

  useEffect(() => {
    if (!open) return;
    setName(ledger.data?.holderName ?? '');
    setError('');
  }, [open, ledger.data?.holderName]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim().replace(/\s+/g, ' ');
    if (trimmed && (trimmed.length < 3 || !trimmed.includes(' '))) { setError('Informe nome e sobrenome.'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await ledger.setHolderName(trimmed);
      const changed = result.paired + result.neutralized;
      notify({ tone: 'success', message: !trimmed ? 'Nome do titular removido.'
        : changed ? `Nome salvo. ${result.paired} transferência${result.paired === 1 ? '' : 's'} vinculada${result.paired === 1 ? '' : 's'} e ${result.neutralized} Pix neutralizado${result.neutralized === 1 ? '' : 's'}.`
          : 'Nome salvo. Nenhum Pix novo para ajustar.' });
      onClose();
    } catch { setError('Não foi possível salvar o nome. Tente novamente.'); }
    finally { setLoading(false); }
  }

  return <Dialog open={open} onClose={onClose} title="Nome do titular"
    description="Pix com o seu nome e sobrenome deixam de contar como receita ou despesa."
    footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" form={formId} loading={loading}>Salvar</Button></>}>
    <form id={formId} className="transaction-form" noValidate onSubmit={submit}>
      <Input label="Nome completo" value={name} maxLength={120} autoComplete="name" onChange={event => setName(event.target.value)}
        hint="Como aparece nos Pix. Com o outro lado numa conta conectada, vira transferência própria; sem ele (conta fora do app), fica neutro." />
      {error && <FormMessage tone="error">{error}</FormMessage>}
    </form>
  </Dialog>;
}
