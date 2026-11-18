import { useId, useState, type ReactNode } from 'react';
import type { Category, FinancialAccount, TransactionContract } from '@personal-finance/domain';
import { Button, Input, Select } from '@personal-finance/ui';
import { UNCATEGORIZED, hasTransactionFilters, type TransactionFilters } from '../lib/transaction-filters';

export const natureLabels: Record<TransactionContract['nature'], string> = {
  income: 'Receita', expense: 'Despesa', refund: 'Estorno', own_transfer: 'Transferência própria', card_payment: 'Pagamento de fatura',
  savings_contribution: 'Aporte', savings_withdrawal: 'Resgate', adjustment: 'Ajuste'
};

/** Busca e filtros comuns a Transações e Revisão; `children` recebe filtros próprios da tela. */
export function TransactionFilterFields({ filters, active, onChange, onClear, accounts, categories, natures, resultCount, children, collapsible = false, toolbar }: {
  /** Mantém só a busca visível; conta, categoria, natureza e `children` ficam atrás do botão “Filtros”. */
  collapsible?: boolean;
  /** Controles extras na linha da busca (só com `collapsible`). */
  toolbar?: ReactNode;
  filters: TransactionFilters;
  /** Considera filtros próprios da tela (como o período) ao exibir “Limpar filtros”. */
  active?: boolean;
  onChange: (key: keyof TransactionFilters, value: string) => void;
  onClear: () => void;
  accounts: readonly FinancialAccount[];
  categories: readonly Category[];
  natures: readonly TransactionContract['nature'][];
  resultCount: number;
  children?: ReactNode;
}) {
  const filtered = active ?? hasTransactionFilters(filters);
  const panelId = useId();
  const [open, setOpen] = useState(Boolean(filters.account || filters.category || filters.nature));
  const search = <Input label="Pesquisar descrição" type="search" value={filters.q} onChange={event => onChange('q', event.target.value)} />;
  return <div className="transaction-filters">
    {collapsible && <div className="transaction-filters__bar">
      {search}{toolbar}
      <Button variant="secondary" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(value => !value)}>Filtros</Button>
    </div>}
    <div className="transactions-filters" id={panelId} hidden={collapsible && !open}>
      {!collapsible && search}
      <Select label="Conta" value={filters.account} onChange={event => onChange('account', event.target.value)}
        options={[{ value: '', label: 'Todas' }, ...accounts.map(account => ({ value: account.id, label: account.name }))]} />
      <Select label="Categoria" value={filters.category} onChange={event => onChange('category', event.target.value)}
        options={[{ value: '', label: 'Todas' }, { value: UNCATEGORIZED, label: 'Sem categoria' },
          ...categories.map(category => ({ value: category.id, label: category.archivedAt ? `${category.name} (arquivada)` : category.name }))]} />
      <Select label="Natureza" value={filters.nature} onChange={event => onChange('nature', event.target.value)}
        options={[{ value: '', label: 'Todas' }, ...natures.map(nature => ({ value: nature, label: natureLabels[nature] }))]} />
      {children}
    </div>
    <div className="transaction-filters__summary">
      <span className="muted" aria-live="polite">{resultCount.toLocaleString('pt-BR')} {resultCount === 1 ? 'lançamento encontrado' : 'lançamentos encontrados'}</span>
      {filtered && <Button size="sm" variant="ghost" onClick={onClear}>Limpar filtros</Button>}
    </div>
  </div>;
}
