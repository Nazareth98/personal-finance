import { useMemo, useState } from 'react';
import { ledgerTotals, type TransactionContract } from '@personal-finance/domain';
import { Badge, Button, Card, DataState, DataTable, EmptyState, Input, MetricCard, Pagination, Select, paginateRows, sortRows, type DataTableColumn, type SortState } from '@personal-finance/ui';
import type { LedgerState } from '../ledger/useLedger';
import { formatCentsBRL, formatLocalDate } from '../lib/demo-transactions';

const PAGE_SIZE = 10;
const labels: Record<TransactionContract['nature'], string> = {
  income: 'Receita', expense: 'Despesa', own_transfer: 'Transferência', card_payment: 'Pagamento de fatura',
  savings_contribution: 'Aporte', savings_withdrawal: 'Resgate', adjustment: 'Ajuste'
};
const tone = (row: TransactionContract) => row.reporting === 'income' ? 'income' : row.reporting === 'expense' ? 'expense' : 'transfer';
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');

export function LedgerTransactions({ ledger }: { ledger: LedgerState }) {
  const [query, setQuery] = useState('');
  const [reporting, setReporting] = useState('all');
  const [period, setPeriod] = useState('all');
  const [sort, setSort] = useState<SortState>({ key: 'date', direction: 'desc' });
  const [page, setPage] = useState(1);
  const data = ledger.data;
  const accounts = new Map((data?.accounts ?? []).map(account => [account.id, account.name]));
  const categories = new Map((data?.categories ?? []).map(category => [category.id, category.name]));
  const columns: DataTableColumn<TransactionContract>[] = [
    { key: 'date', header: 'Data', sortable: true, sortValue: row => row.eventDate, cell: row => formatLocalDate(row.eventDate) },
    { key: 'description', header: 'Descrição', sortable: true, sortValue: row => row.description, cell: row => <><strong>{row.description}</strong><br/><span className="muted">{row.source === 'pluggy' ? 'Importado · imutável' : 'Manual'}</span></> },
    { key: 'account', header: 'Conta', cell: row => accounts.get(row.accountId) ?? 'Conta removida' },
    { key: 'category', header: 'Categoria', cell: row => row.categoryId ? categories.get(row.categoryId) ?? 'Sem categoria' : 'Sem categoria' },
    { key: 'nature', header: 'Tipo', cell: row => <Badge tone={tone(row)}>{labels[row.nature]}</Badge> },
    { key: 'amount', header: 'Valor', align: 'end', sortable: true, sortValue: row => row.amountCents, cell: row => <span className={`transaction-amount transaction-amount--${tone(row)}`}>{row.amountCents > 0n ? '+ ' : '− '}{formatCentsBRL(row.amountCents < 0n ? -row.amountCents : row.amountCents)}</span> }
  ];
  const periodOptions = useMemo(() => {
    const months = [...new Set((data?.transactions ?? []).map(row => row.competence))].sort().reverse();
    const years = [...new Set(months.map(month => month.slice(0, 4)))];
    return [{ value: 'all', label: 'Todo o histórico' }, ...months.map(value => ({ value, label: `Mês ${value.slice(5)}/${value.slice(0, 4)}` })), ...years.map(value => ({ value, label: `Ano ${value}` }))];
  }, [data]);
  const filtered = useMemo(() => (data?.transactions ?? []).filter(row => {
    const search = normalize(query.trim());
    return (reporting === 'all' || row.reporting === reporting)
      && (period === 'all' || (period.length === 4 ? row.competence.startsWith(period) : row.competence === period))
      && (!search || normalize(`${row.description} ${accounts.get(row.accountId) ?? ''} ${row.categoryId ? categories.get(row.categoryId) ?? '' : ''}`).includes(search));
  }), [data, query, reporting, period]);
  const rows = useMemo(() => sortRows(filtered, sort, columns), [filtered, sort]);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / PAGE_SIZE)));
  const totals = ledgerTotals(filtered);

  return <section className="transactions-demo" aria-labelledby="transactions-title">
    <div className="transactions-filters">
      <Input label="Pesquisar" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} />
      <Select label="Efeito" value={reporting} options={[{ value: 'all', label: 'Todos' }, { value: 'income', label: 'Receitas' }, { value: 'expense', label: 'Despesas' }, { value: 'neutral', label: 'Patrimoniais' }]} onChange={event => { setReporting(event.target.value); setPage(1); }} />
      <Select label="Período" value={period} options={periodOptions} onChange={event => { setPeriod(event.target.value); setPage(1); }} />
    </div>
    <div className="transactions-metrics" aria-label="Totais do período">
      <MetricCard label="Receitas" value={formatCentsBRL(totals.incomeCents)} tone="income" supportingText="Transferências não entram" />
      <MetricCard label="Despesas" value={formatCentsBRL(totals.expenseCents)} tone="expense" supportingText="Inclui ajustes de despesa" />
      <MetricCard label="Resultado" value={formatCentsBRL(totals.netCents)} supportingText="Receitas menos despesas" />
    </div>
    <Card className="transactions-table-card"><DataState status={ledger.status === 'idle' ? 'loading' : ledger.status} kind="table" rows={5} columns={6} label="Carregando livro financeiro" errorTitle="Erro ao carregar lançamentos" errorDescription={ledger.error} onRetry={() => void ledger.reload()}>
      {rows.length ? <><DataTable ariaLabel="Livro financeiro" columns={columns} rows={paginateRows(rows, currentPage, PAGE_SIZE)} getRowKey={row => row.id} sort={sort} onSortChange={setSort} /><Pagination page={currentPage} pageSize={PAGE_SIZE} totalItems={rows.length} onPageChange={setPage} /></>
        : <EmptyState title="Nenhuma movimentação encontrada" description="Cadastre uma movimentação ou altere os filtros." action={(query || reporting !== 'all' || period !== 'all') ? <Button variant="secondary" onClick={() => { setQuery(''); setReporting('all'); setPeriod('all'); }}>Limpar filtros</Button> : undefined} />}
    </DataState></Card>
  </section>;
}
