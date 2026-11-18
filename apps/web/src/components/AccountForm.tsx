import { useState, type FormEvent } from 'react';
import { ArchiveIcon, Button, Dialog, FormMessage, Icon, Input, Select, useToast } from '@personal-finance/ui';
import type { FinancialAccount } from '@personal-finance/domain';
import type { LedgerState } from '../ledger/useLedger';
import { formatCentsBRL } from '../lib/demo-transactions';
import { parseBrlCents } from '../lib/transaction-validation';

const typeOptions = [
  { value: 'checking', label: 'Conta corrente' }, { value: 'savings', label: 'Reserva/poupança' },
  { value: 'investment', label: 'Investimento' }, { value: 'credit_card', label: 'Cartão de crédito' }
];
const centsInput = (cents: bigint) => (cents < 0n ? '-' : '') + formatCentsBRL(cents < 0n ? -cents : cents).replace('R$ ', '');

/**
 * Cria ou edita uma conta (D-040). Com `account`, o tipo fica fixo e o diálogo também arquiva:
 * a conta sai das telas e dos saldos, mas os lançamentos continuam no livro. Monte com `key`.
 */
export function AccountForm({ open, onClose, ledger, account }: { open: boolean; onClose: () => void; ledger: LedgerState; account?: FinancialAccount }) {
  const [name, setName] = useState(account?.name ?? '');
  const [type, setType] = useState<FinancialAccount['type']>(account?.type ?? 'checking');
  const [opening, setOpening] = useState(account ? centsInput(account.openingBalanceCents) : '0,00');
  const [confirmingArchive, setConfirmingArchive] = useState(false);
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
      if (account) await ledger.updateAccount(account.id, { name: name.trim(), openingBalanceCents });
      else await ledger.createAccount({ name: name.trim(), type, openingBalanceCents });
      notify({ message: account ? 'Conta atualizada.' : 'Conta cadastrada.', tone: 'success' });
      onClose();
    } catch {
      setError(account ? 'Não foi possível salvar a conta.' : 'Não foi possível cadastrar a conta.');
    } finally { setLoading(false); }
  }

  async function archive() {
    if (!account) return;
    setLoading(true);
    setError('');
    try {
      await ledger.archiveAccount(account.id);
      notify({ message: 'Conta arquivada; os lançamentos continuam no livro.', tone: 'success' });
      onClose();
    } catch {
      setError('Não foi possível arquivar a conta.');
    } finally { setLoading(false); }
  }

  if (account && confirmingArchive) {
    return <Dialog open={open} onClose={onClose} title={`Arquivar ${account.name}?`}
      description="A conta sai desta tela, dos saldos e das listas de contas. Os lançamentos continuam em Transações, receitas e despesas. Se ela estiver conectada ao MeuPluggy, desconecte a instituição para parar de importar.">
      <div className="transaction-form">
        {error && <FormMessage tone="error">{error}</FormMessage>}
        <div className="transaction-form__actions">
          <Button variant="ghost" onClick={() => { setConfirmingArchive(false); setError(''); }}>Voltar</Button>
          <Button variant="danger" loading={loading} onClick={() => void archive()}><Icon icon={ArchiveIcon} size="sm" />Arquivar conta</Button>
        </div>
      </div>
    </Dialog>;
  }

  return <Dialog open={open} onClose={onClose} title={account ? `Editar ${account.name}` : 'Nova conta'}
    description="O saldo inicial serve como ponto de partida do livro financeiro.">
    <form onSubmit={submit} noValidate className="transaction-form">
      <Input label="Nome da conta" value={name} maxLength={80} required onChange={event => setName(event.target.value)} />
      <Select label="Tipo" value={type} options={typeOptions} disabled={Boolean(account)}
        hint={account ? 'O tipo não muda depois de criada a conta.' : undefined}
        onChange={event => setType(event.target.value as FinancialAccount['type'])} />
      <Input label="Saldo inicial (R$)" inputMode="decimal" value={opening} required onChange={event => setOpening(event.target.value)} />
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <div className="transaction-form__actions budget-form__actions">
        {account && <Button variant="ghost" className="budget-form__delete" onClick={() => { setConfirmingArchive(true); setError(''); }}>
          <Icon icon={ArchiveIcon} size="sm" />Arquivar conta</Button>}
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button type="submit" loading={loading}>{account ? 'Salvar conta' : 'Cadastrar conta'}</Button>
      </div>
    </form>
  </Dialog>;
}
