import { useState, type FormEvent } from 'react';
import type { SavingsBox } from '@personal-finance/domain';
import { Button, DeleteIcon, Dialog, FormMessage, Icon, Input, useToast } from '@personal-finance/ui';
import type { LedgerState } from '../ledger/useLedger';
import { formatCentsBRL } from '../lib/demo-transactions';
import { parseBrlCents } from '../lib/transaction-validation';

const centsInput = (cents: bigint) => formatCentsBRL(cents).replace('R$ ', '');

/**
 * Cria ou edita uma caixinha. Com `box`, o diálogo também exclui: sem histórico a caixinha
 * some; com movimentos ou vínculos ela é arquivada e os lançamentos seguem no livro (D-039).
 * Monte com `key` para reiniciar o estado.
 */
export function SavingsBoxForm({ open, onClose, ledger, box, hasHistory = false }: {
  open: boolean; onClose: () => void; ledger: LedgerState; box?: SavingsBox; hasHistory?: boolean;
}) {
  const [name, setName] = useState(box?.name ?? '');
  const [openingBalance, setOpeningBalance] = useState(box ? centsInput(box.openingBalanceCents) : '0,00');
  const [target, setTarget] = useState(box ? centsInput(box.targetCents) : '');
  const [targetDate, setTargetDate] = useState(box?.targetDate ?? '');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
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
    const draft = { name: name.trim(), openingBalanceCents, targetCents, targetDate: targetDate || undefined };
    try {
      if (box) await ledger.updateSavingsBox(box.id, draft);
      else await ledger.createSavingsBox(draft);
      notify({ message: box ? 'Caixinha atualizada.' : 'Caixinha cadastrada.', tone: 'success' });
      onClose();
    } catch {
      setError(box
        ? 'Não foi possível salvar. Verifique se o nome já existe ou se o saldo inicial deixaria a caixinha negativa.'
        : 'Não foi possível cadastrar a caixinha. Verifique se o nome já existe.');
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!box) return;
    setLoading(true);
    setError('');
    try {
      const result = await ledger.deleteSavingsBox(box.id);
      notify({ message: result === 'archived' ? 'Caixinha arquivada; os lançamentos continuam no livro.' : 'Caixinha excluída.', tone: 'success' });
      onClose();
    } catch {
      setError('Não foi possível excluir a caixinha.');
    } finally {
      setLoading(false);
    }
  }

  if (box && confirmingDelete) {
    return <Dialog open={open} onClose={onClose} title={`Excluir ${box.name}?`}
      description={hasHistory
        ? 'Ela tem movimentos, então será arquivada: sai desta tela e das previsões, mas aportes e resgates continuam no livro.'
        : 'Ela não tem movimentos e será excluída definitivamente.'}>
      <div className="transaction-form">
        {error && <FormMessage tone="error">{error}</FormMessage>}
        <div data-dialog-actions className="transaction-form__actions">
          <Button variant="ghost" onClick={() => { setConfirmingDelete(false); setError(''); }}>Voltar</Button>
          <Button variant="danger" loading={loading} onClick={() => void remove()}><Icon icon={DeleteIcon} size="sm" />{hasHistory ? 'Arquivar' : 'Excluir'}</Button>
        </div>
      </div>
    </Dialog>;
  }

  return <Dialog open={open} onClose={onClose} title={box ? `Editar ${box.name}` : 'Nova caixinha'}
    description="O saldo é reconstruído pelo valor inicial e pelos movimentos vinculados.">
    <form className="transaction-form" noValidate onSubmit={submit}>
      <Input label="Nome da caixinha" value={name} maxLength={80} required onChange={event => setName(event.target.value)} />
      <Input label="Saldo inicial" startText="R$" inputMode="decimal" value={openingBalance} required onChange={event => setOpeningBalance(event.target.value)} />
      <Input label="Meta" startText="R$" inputMode="decimal" value={target} required onChange={event => setTarget(event.target.value)} />
      <Input label="Data-alvo (opcional)" type="date" value={targetDate} hint="Com data, a tela calcula quanto guardar por mês." onChange={event => setTargetDate(event.target.value)} />
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <div data-dialog-actions className="transaction-form__actions budget-form__actions">
        {box && <Button variant="ghost" className="budget-form__delete" onClick={() => { setConfirmingDelete(true); setError(''); }}>
          <Icon icon={DeleteIcon} size="sm" />Excluir caixinha</Button>}
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button type="submit" loading={loading}>Salvar</Button>
      </div>
    </form>
  </Dialog>;
}
