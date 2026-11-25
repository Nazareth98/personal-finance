import { useId, useState, type ReactNode } from 'react';
import type { Category, FinancialAccount, TransactionContract } from '@personal-finance/domain';
import { Button, CategoryWalletIcon as WalletIcon, CloseIcon, FilterIcon, Icon, Input, Select, StatusPendingIcon, VisualSelect } from '@personal-finance/ui';
import type { AccountInstitution } from '../ledger/contracts';
import { OptionTile, accountOption, allOption, categoryOption } from './visual-options';
import { UNCATEGORIZED, hasTransactionFilters, type TransactionFilters } from '../lib/transaction-filters';

export const natureLabels: Record<TransactionContract['nature'], string> = {
  income: 'Receita', expense: 'Despesa', refund: 'Estorno', own_transfer: 'Transferência própria', card_payment: 'Pagamento de fatura',
  savings_contribution: 'Aporte', savings_withdrawal: 'Resgate', adjustment: 'Ajuste'
};

/** Busca e filtros comuns a Transações e Revisão; `children` recebe filtros próprios da tela. */
export function TransactionFilterFields({ filters, active, onChange, onClear, accounts, categories, natures, resultCount, children, collapsible = false, toolbar, extraActiveCount = 0, institutions }: {
  /** Logos dos bancos nas opções de conta. */
  institutions?: readonly AccountInstitution[];
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
  /** Filtros próprios da tela que estão atrás do botão (ex.: estado do histórico) e contam no contador. */
  extraActiveCount?: number;
}) {
  const filtered = active ?? hasTransactionFilters(filters);
  const panelId = useId();
  const [open, setOpen] = useState(Boolean(filters.account || filters.category || filters.nature));
  const chips: { key: keyof TransactionFilters; label: string }[] = [];
  if (filters.account) chips.push({ key: 'account', label: `Conta: ${accounts.find(account => account.id === filters.account)?.name ?? 'Conta arquivada'}` });
  if (filters.category) chips.push({ key: 'category', label: `Categoria: ${filters.category === UNCATEGORIZED ? 'Sem categoria' : categories.find(category => category.id === filters.category)?.name ?? 'Indisponível'}` });
  if (filters.nature) chips.push({ key: 'nature', label: `Natureza: ${natureLabels[filters.nature as TransactionContract['nature']] ?? filters.nature}` });
  const activeCount = chips.length + extraActiveCount;
  const search = <Input label="Pesquisar descrição" type="search" value={filters.q} onChange={event => onChange('q', event.target.value)} />;
  return <div className="transaction-filters">
    {collapsible && <div className="transaction-filters__bar">
      {search}{toolbar}
      <Button variant="secondary" className={`filter-toggle${open ? ' is-open' : ''}`} aria-expanded={open} aria-controls={panelId}
        aria-label={activeCount ? `Filtros, ${activeCount} ${activeCount === 1 ? 'ativo' : 'ativos'}` : 'Filtros'} title="Filtros"
        onClick={() => setOpen(value => !value)}>
        <Icon icon={FilterIcon} size="sm" />{activeCount > 0 && <span className="filter-toggle__count" aria-hidden="true">{activeCount}</span>}
      </Button>
    </div>}
    {collapsible && chips.length > 0 && <ul className="filter-chips" aria-label="Filtros ativos">{chips.map(chip => <li key={chip.key}>
      <button type="button" className="filter-chip" aria-label={`Remover filtro ${chip.label}`} onClick={() => onChange(chip.key, '')}>
        {chip.label}<Icon icon={CloseIcon} size="sm" /></button></li>)}</ul>}
    <div className={`transactions-filters${collapsible ? ' filter-panel' : ''}`} id={panelId} hidden={collapsible && !open}>
      {!collapsible && search}
      <VisualSelect label="Conta" value={filters.account} onChange={value => onChange('account', value)}
        options={[allOption('Todas', <OptionTile icon={WalletIcon} />), ...accounts.map(account => accountOption(account, institutions, account.name, true))]} />
      <VisualSelect label="Categoria" value={filters.category} searchable={categories.length > 8} onChange={value => onChange('category', value)}
        options={[allOption(), { value: UNCATEGORIZED, label: 'Sem categoria', visual: <OptionTile icon={StatusPendingIcon} /> },
          ...categories.map(categoryOption)]} />
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
