import { usePageSize } from '../hooks/usePageSize';
import { useMemo, useState } from 'react';
import { ledgerTotals, type TransactionContract } from '@personal-finance/domain';
import { Badge, Button, Card, DataState, DataTable, EmptyState, Pagination, Select, TransactionsIcon, paginateRows, sortRows, type DataTableColumn, type SortState } from '@personal-finance/ui';
import type { LedgerState } from '../ledger/useLedger';
import { useHashParams } from '../hooks/useHashParams';
import { formatCentsBRL, formatCompetence } from '../lib/demo-transactions';
import { matchesTransactionFilters, readTransactionFilters, transactionFilterKeys, type TransactionFilters } from '../lib/transaction-filters';
import { TransactionFilterFields, natureLabels } from './TransactionFilterFields';
import { InstitutionLogo } from './InstitutionLogo';
import { eventSortKey } from '../lib/transaction-time';
import { DateTime } from './DateTime';

const tone = (row: TransactionContract) => row.reporting === 'income' ? 'income' : row.reporting === 'expense' ? 'expense' : 'transfer';

export function LedgerTransactions({ ledger }: { ledger: LedgerState }) {
  const [params, setParams] = useHashParams();
  const filters = readTransactionFilters(params);
  const period = params.get('period') ?? '';
  const [sort, setSort] = useState<SortState>({ key: 'date', direction: 'desc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize, pageSizeOptions] = usePageSize('transactions', 10);
  const data = ledger.data;
  const accounts = new Map((data?.accounts ?? []).map(account => [account.id, account.name]));
  // D-084: selo “Fixo” nos lançamentos vinculados a um fixo.
  const fixedItemNames = new Map((data?.fixedItems ?? []).map(item => [item.id, item.name]));
  const fixedNames = new Map((data?.fixedItemLinks ?? []).map(link => [link.transactionId, fixedItemNames.get(link.fixedItemId) ?? '']));
  const categories = new Map((data?.categories ?? []).map(category => [category.id, category.name]));
  const categoryName = (row: TransactionContract) => row.categoryId ? categories.get(row.categoryId) ?? 'Sem categoria' : 'Sem categoria';
  const columns: DataTableColumn<TransactionContract>[] = [
    { mobile: 'detail', key: 'date', header: 'Data', sortable: true, sortValue: row => eventSortKey(row), cell: row => <DateTime row={row} /> },
    { mobile: 'primary', key: 'description', header: 'Descrição', headerIcon: TransactionsIcon, iconTone: 'transfer', sortable: true, sortValue: row => row.description, cell: row => <span className="ledger-description"><span className="ledger-description__title"><strong>{row.description}</strong>{row.source !== 'pluggy' && <Badge>Manual</Badge>}{fixedNames.get(row.id) ? <Badge tone="transfer" title={`Fixo: ${fixedNames.get(row.id)}`}>Fixo</Badge> : null}</span><span className="muted ledger-description__account"><InstitutionLogo accountId={row.accountId} accountName={accounts.get(row.accountId) ?? 'Conta'} institutions={data?.institutions} size="sm" />{accounts.get(row.accountId) ?? 'Conta arquivada'}</span></span> },
    { mobile: 'detail', key: 'category', header: 'Categoria', sortable: true, sortValue: categoryName, cell: categoryName },
    { mobile: 'detail', key: 'nature', header: 'Tipo', sortable: true, sortValue: row => natureLabels[row.nature], cell: row => <Badge tone={tone(row)}>{natureLabels[row.nature]}</Badge> },
    { mobile: 'value', key: 'amount', header: 'Valor', align: 'end', sortable: true, sortValue: row => row.amountCents, cell: row => <span className={`transaction-amount transaction-amount--${tone(row)}`}>{row.amountCents > 0n ? '+ ' : '− '}{formatCentsBRL(row.amountCents < 0n ? -row.amountCents : row.amountCents)}</span> }
  ];
  const periodOptions = useMemo(() => {
    const months = [...new Set((data?.transactions ?? []).map(row => row.competence))].sort().reverse();
    const years = [...new Set(months.map(month => month.slice(0, 4)))];
    return [{ value: '', label: 'Todo o histórico' }, ...months.map(value => ({ value, label: formatCompetence(value) })), ...years.map(value => ({ value, label: `Ano ${value}` }))];
  }, [data]);
  const filtered = (data?.transactions ?? []).filter(row => matchesTransactionFilters(row, filters)
    && (!period || (period.length === 4 ? row.competence.startsWith(`${period}-`) : row.competence === period)));
  const rows = sortRows(filtered, sort, columns);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / pageSize)));
  const totals = ledgerTotals(filtered);
  const active = Boolean(period) || transactionFilterKeys.some(key => filters[key]);
  const change = (key: keyof TransactionFilters | 'period', value: string) => { setParams({ [key]: value }); setPage(1); };
  const clear = () => { setParams({ q: null, account: null, category: null, nature: null, period: null }); setPage(1); };
  const natures = [...new Set((data?.transactions ?? []).map(row => row.nature))];

  const net = totals.netCents < 0n ? `− ${formatCentsBRL(-totals.netCents)}` : formatCentsBRL(totals.netCents);
  return <section className="transactions-demo ledger-transactions" aria-labelledby="transactions-title">
    <TransactionFilterFields collapsible institutions={data?.institutions} filters={filters} active={active} onChange={change} onClear={clear} resultCount={filtered.length}
      accounts={data?.accounts ?? []} categories={data?.categories ?? []} natures={natures}
      toolbar={<div className="ledger-period"><Select label="Período" value={period} options={periodOptions} onChange={event => change('period', event.target.value)} /></div>} />
    <section className="ledger-totals" aria-label="Totais do período">
      <div><span className="muted">Receitas</span><strong className="transaction-amount--income">+ {formatCentsBRL(totals.incomeCents)}</strong><span className="muted">Transferências não entram</span></div>
      <div><span className="muted">Despesas</span><strong className="transaction-amount--expense">− {formatCentsBRL(totals.expenseCents)}</strong><span className="muted">Inclui ajustes de despesa</span></div>
      <div><span className="muted">Resultado</span><strong>{net}</strong><span className="muted">Receitas menos despesas</span></div>
    </section>
    <Card className="transactions-table-card"><DataState status={ledger.status === 'idle' ? 'loading' : ledger.status} kind="table" rows={5} columns={6} label="Carregando lançamentos" errorTitle="Erro ao carregar lançamentos" errorDescription={ledger.error} onRetry={() => void ledger.reload()}>
      {rows.length ? <><DataTable ariaLabel="Lançamentos" columns={columns} rows={paginateRows(rows, currentPage, pageSize)} getRowKey={row => row.id} sort={sort} onSortChange={setSort} /><Pagination page={currentPage} pageSize={pageSize} totalItems={rows.length} onPageChange={setPage} pageSizeOptions={pageSizeOptions} onPageSizeChange={size => { setPageSize(size); setPage(1); }} /></>
        : <EmptyState title={active ? 'Nada com esses filtros' : 'Nenhum lançamento neste período'} description={active ? 'Limpe os filtros para ver todos os lançamentos.' : 'Os lançamentos chegam pela conexão com o banco. Escolha outro mês ou confira Conexões.'}
          action={active ? <Button variant="secondary" onClick={clear}>Limpar filtros</Button> : <a href="#connections">Abrir Conexões</a>} />}
    </DataState></Card>
  </section>;
}
