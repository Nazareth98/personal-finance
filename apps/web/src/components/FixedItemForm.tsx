import { useEffect, useId, useState, type FormEvent } from 'react';
import type { FixedItem } from '@personal-finance/domain';
import { Button, Dialog, FormMessage, Input, VisualSelect, useToast } from '@personal-finance/ui';
import type { LedgerState } from '../ledger/useLedger';
import { categoryOption } from './visual-options';

/** D-084: renomear, trocar categoria e encerrar/reativar um fixo. Vínculos e histórico não mudam. */
export function FixedItemForm({ item, onClose, ledger }: { item: FixedItem | null; onClose: () => void; ledger: LedgerState }) {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState<'' | 'save' | 'end'>('');
  const formId = useId();
  const { notify } = useToast();
  useEffect(() => { if (item) { setName(item.name); setCategoryId(item.categoryId ?? ''); setError(''); } }, [item]);
  const options = (ledger.data?.categories ?? [])
    .filter(category => !category.archivedAt && category.applicability === item?.nature).map(categoryOption);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!item || loading) return;
    if (name.trim().length < 2) { setError('Dê um nome com pelo menos 2 letras.'); return; }
    setLoading('save'); setError('');
    try {
      await ledger.updateFixedItem(item.id, name.trim(), categoryId || undefined);
      notify({ tone: 'success', message: 'Fixo atualizado.' });
      onClose();
    } catch { setError('Não foi possível salvar. Já existe um fixo ativo com esse nome?'); }
    finally { setLoading(''); }
  }

  async function toggleEnded() {
    if (!item || loading) return;
    setLoading('end'); setError('');
    try {
      await ledger.setFixedItemEnded(item.id, !item.endedAt);
      notify({ tone: 'success', message: item.endedAt ? 'Fixo reativado.' : 'Fixo encerrado. Ele sai das próximas previsões.' });
      onClose();
    } catch { setError(item.endedAt ? 'Não foi possível reativar. Já existe um fixo ativo com esse nome?' : 'Não foi possível encerrar. Tente novamente.'); }
    finally { setLoading(''); }
  }

  return <Dialog open={Boolean(item)} onClose={() => { if (!loading) onClose(); }} title="Editar fixo"
    description="Os lançamentos já vinculados continuam ligados a este fixo."
    footer={<>
      <Button variant="secondary" loading={loading === 'end'} disabled={loading === 'save'} onClick={() => void toggleEnded()}>{item?.endedAt ? 'Reativar' : 'Encerrar fixo'}</Button>
      <Button type="submit" form={formId} loading={loading === 'save'} disabled={loading === 'end'}>Salvar</Button>
    </>}>
    <form id={formId} className="transaction-form" noValidate onSubmit={submit}>
      <Input label="Nome" value={name} required maxLength={80} onChange={event => { setName(event.target.value); setError(''); }} />
      <VisualSelect label="Categoria" value={categoryId} placeholder="Sem categoria" options={options} searchable={options.length > 8}
        hint="Usada para mostrar quanto da meta da categoria já está comprometido." onChange={setCategoryId} />
      <p className="muted">Encerrar tira o fixo das próximas previsões e para de vincular lançamentos novos. Nada é apagado.</p>
      {error && <FormMessage tone="error">{error}</FormMessage>}
    </form>
  </Dialog>;
}
