import { useMemo, useState } from 'react';
import { ledgerTotals, type TransactionContract } from '@personal-finance/domain';
import { Badge, Button, Card, DataState, DataTable, EmptyState, MetricCard, Pagination, Select, TransactionsIcon, paginateRows, sortRows, type DataTableColumn, type SortState } from '@personal-finance/ui';
import type { LedgerState } from '../ledger/useLedger';
import { useHashParams } from '../hooks/useHashParams';
import { formatCentsBRL, formatCompetence, formatLocalDate } from '../lib/demo-transactions';
import { matchesTransactionFilters, readTransactionFilters, transactionFilterKeys, type TransactionFilters } from '../lib/transaction-filters';
import { TransactionFilterFields, natureLabels } from './TransactionFilterFields';

const PAGE_SIZE = 10;
const tone = (row: TransactionContract) => row.reporting === 'income' ? 'income' : row.reporting === 'expense' ? 'expense' : 'transfer';

export function LedgerTransactions({ ledger }: { ledger: LedgerState }) {
  const [params, setParams] = useHashParams();
  const filters = readTransactionFilters(params);
  const period = params.get('period') ?? '';
  const [sort, setSort] = useState<SortState>({ key: 'date', direction: 'desc' });
  const [page, setPage] = useState(1);
  const data = ledger.data;
  const accounts = new Map((data?.accounts ?? []).map(account => [account.id, account.name]));
  const categories = new Map((data?.categories ?? []).map(category => [category.id, category.name]));
  const categoryName = (row: TransactionContract) => row.categoryId ? categories.get(row.categoryId) ?? 'Sem categoria' : 'Sem categoria';
  const columns: DataTableColumn<TransactionContract>[] = [
    { key: 'date', header: 'Data', sortable: true, sortValue: row => row.eventDate, cell: row => formatLocalDate(row.eventDate) },
    { key: 'description', header: 'Descrição', headerIcon: TransactionsIcon, iconTone: 'transfer', sortable: true, sortValue: row => row.description, cell: row => <><strong>{row.description}</strong><br/><span className="muted">{row.source === 'pluggy' ? 'Importado · imutável' : 'Manual'}</span></> },
    { key: 'account', header: 'Conta', sortable: true, sortValue: row => accounts.get(row.accountId), cell: row => accounts.get(row.accountId) ?? 'Conta removida' },
    { key: 'category', header: 'Categoria', sortable: true, sortValue: categoryName, cell: categoryName },
    { key: 'nature', header: 'Tipo', sortable: true, sortValue: row => natureLabels[row.nature], cell: row => <Badge tone={tone(row)}>{natureLabels[row.nature]}</Badge> },
    { key: 'amount', header: 'Valor', align: 'end', sortable: true, sortValue: row => row.amountCents, cell: row => <span className={`transaction-amount transaction-amount--${tone(row)}`}>{row.amountCents > 0n ? '+ ' : '− '}{formatCentsBRL(row.amountCents < 0n ? -row.amountCents : row.amountCents)}</span> }
  ];
  const periodOptions = useMemo(() => {
    const months = [...new Set((data?.transactions ?? []).map(row => row.competence))].sort().reverse();
    const years = [...new Set(months.map(month => month.slice(0, 4)))];
    return [{ value: '', label: 'Todo o histórico' }, ...months.map(value => ({ value, label: formatCompetence(value) })), ...years.map(value => ({ value, label: `Ano ${value}` }))];
  }, [data]);
  const filtered = (data?.transactions ?? []).filter(row => matchesTransactionFilters(row, filters)
    && (!period || (period.length === 4 ? row.competence.startsWith(`${period}-`) : row.competence === period)));
  const rows = sortRows(filtered, sort, columns);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / PAGE_SIZE)));
  const totals = ledgerTotals(filtered);
  const active = Boolean(period) || transactionFilterKeys.some(key => filters[key]);
  const change = (key: keyof TransactionFilters | 'period', value: string) => { setParams({ [key]: value }); setPage(1); };
  const clear = () => { setParams({ q: null, account: null, category: null, nature: null, period: null }); setPage(1); };
  const natures = [...new Set((data?.transactions ?? []).map(row => row.nature))];

  return <section className="transactions-demo" aria-labelledby="transactions-title">
    <TransactionFilterFields filters={filters} active={active} onChange={change} onClear={clear} resultCount={filtered.length}
      accounts={data?.accounts ?? []} categories={data?.categories ?? []} natures={natures}>
      <Select label="Período" value={period} options={periodOptions} onChange={event => change('period', event.target.value)} />
    </TransactionFilterFields>
    <div className="transactions-metrics" aria-label="Totais do período">
      <MetricCard label="Receitas" value={formatCentsBRL(totals.incomeCents)} tone="income" supportingText="Transferências não entram" />
      <MetricCard label="Despesas" value={formatCentsBRL(totals.expenseCents)} tone="expense" supportingText="Inclui ajustes de despesa" />
      <MetricCard label="Resultado" value={formatCentsBRL(totals.netCents)} supportingText="Receitas menos despesas" />
    </div>
    <Card className="transactions-table-card"><DataState status={ledger.status === 'idle' ? 'loading' : ledger.status} kind="table" rows={5} columns={6} label="Carregando livro financeiro" errorTitle="Erro ao carregar lançamentos" errorDescription={ledger.error} onRetry={() => void ledger.reload()}>
      {rows.length ? <><DataTable ariaLabel="Livro financeiro" columns={columns} rows={paginateRows(rows, currentPage, PAGE_SIZE)} getRowKey={row => row.id} sort={sort} onSortChange={setSort} /><Pagination page={currentPage} pageSize={PAGE_SIZE} totalItems={rows.length} onPageChange={setPage} /></>
        : <EmptyState title="Nenhuma movimentação encontrada" description="Cadastre uma movimentação ou altere os filtros." action={active ? <Button variant="secondary" onClick={clear}>Limpar filtros</Button> : undefined} />}
    </DataState></Card>
  </section>;
}
