import { useState } from 'react';
import type { TransactionContract } from '@personal-finance/domain';
import { Badge, Button, Card, DataState, DataTable, EmptyState, FinancialValue, MetricCard, Pagination, ReviewIcon, Select, sortRows, type DataTableColumn, type SortState } from '@personal-finance/ui';
import type { TransactionClassification } from '../ledger/contracts';
import { formatCentsBRL, formatLocalDate } from '../lib/demo-transactions';
import { reviewResolution, reviewableTransactions } from '../lib/review-queue';
import { matchesTransactionFilters, readTransactionFilters, type TransactionFilters } from '../lib/transaction-filters';
import { useHashParams } from '../hooks/useHashParams';
import { ClassificationReviewForm } from '../components/ClassificationReviewForm';
import { TransactionFilterFields, natureLabels } from '../components/TransactionFilterFields';
import type { PageProps } from './PageProps';

type HistoryFilter = 'all' | 'automatic' | 'confirmed';
const pageSize = 20;
const reviewNatures: TransactionContract['nature'][] = ['income', 'expense', 'own_transfer', 'card_payment', 'savings_contribution', 'savings_withdrawal'];

function confidenceLabel(value: number): string {
  return `${(value / 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
}

export function ReviewPage({ ledger, headerAction }: PageProps) {
  const [selected, setSelected] = useState<TransactionContract | null>(null);
  const [params, setParams] = useHashParams();
  const [sort, setSort] = useState<SortState>({ key: 'date', direction: 'desc' });
  const [page, setPage] = useState(1);
  if (!ledger) return <div className="template-page">
    <div className="template-heading"><div><p className="eyebrow">CATEGORIZAÇÃO</p><h1>Revisão de categorias</h1>
      <p className="muted">Sugestões explicáveis aparecem aqui somente no ambiente autenticado.</p></div><div className="template-heading__actions"><Badge>Modo demonstrativo</Badge>{headerAction}</div></div>
    <Card><EmptyState title="Nenhuma classificação demonstrativa" description="Descrições e evidências bancárias reais nunca entram nos baselines visuais."/></Card>
  </div>;

  const view = params.get('view') === 'history' ? 'history' : 'pending';
  const historyFilter = (['automatic', 'confirmed'].includes(params.get('status') ?? '') ? params.get('status') : 'all') as HistoryFilter;
  const filters = readTransactionFilters(params);
  const data = ledger.data;
  const classifications = new Map((data?.classifications ?? []).map(item => [item.transactionId, item]));
  const categories = new Map((data?.categories ?? []).map(item => [item.id, item.name]));
  const accounts = new Map((data?.accounts ?? []).map(item => [item.id, item.name]));
  const relations = {
    semanticOverrides: data?.semanticOverrides ?? [], links: data?.links ?? [],
    savingsMovements: data?.savingsMovements ?? [], cardStatementEntries: data?.cardStatementEntries ?? []
  };
  const imported = reviewableTransactions(data?.transactions ?? []);
  const resolutions = new Map(imported.map(row => [row.id, reviewResolution(row, relations)]));
  const pending = imported.filter(row => resolutions.get(row.id)?.pending);
  const history = imported.filter(row => !resolutions.get(row.id)?.pending);
  const statusLabel = (row: TransactionContract) => {
    const resolution = resolutions.get(row.id);
    if (!resolution?.semanticResolved) return 'Vínculo pendente';
    if (!resolution.categoryResolved) return row.classificationStatus === 'suggested' ? 'Revisar categoria' : 'Sem categoria';
    return row.classificationStatus === 'automatic' ? 'Automática' : 'Confirmada';
  };
  const categoryName = (row: TransactionContract) => row.categoryId ? categories.get(row.categoryId) ?? 'Sem categoria' : undefined;
  const automatic = history.filter(row => row.classificationStatus === 'automatic').length;
  const confirmed = history.length - automatic;

  const columns: DataTableColumn<TransactionContract>[] = [
    { key: 'date', header: 'Data', sortable: true, sortValue: row => row.eventDate, cell: row => formatLocalDate(row.eventDate) },
    { key: 'description', header: 'Lançamento', headerIcon: ReviewIcon, iconTone: 'warning', sortable: true, sortValue: row => row.description, cell: row => {
      const classification: TransactionClassification | undefined = classifications.get(row.id);
      return <><strong>{row.description}</strong><br/><span className="muted">{accounts.get(row.accountId) ?? 'Conta'}
        {classification?.evidence.length ? ` · ${classification.evidence.map(item => item.label).join(' · ')} · ${confidenceLabel(classification.confidenceBasisPoints)}` : ''}</span></>;
    } },
    { key: 'nature', header: 'Natureza', sortable: true, sortValue: row => natureLabels[row.nature], cell: row => <Badge tone={row.reporting === 'income' ? 'income' : row.reporting === 'expense' ? 'expense' : 'transfer'}>{natureLabels[row.nature]}</Badge> },
    { key: 'category', header: 'Categoria', sortable: true, sortValue: categoryName, cell: row => categoryName(row) ?? <span className="muted">Não se aplica</span> },
    { key: 'status', header: 'Situação', sortable: true, sortValue: statusLabel, cell: row => <Badge>{statusLabel(row)}</Badge> },
    { key: 'amount', header: 'Valor', align: 'end', sortable: true, sortValue: row => row.amountCents, cell: row => <FinancialValue value={formatCentsBRL(row.amountCents < 0n ? -row.amountCents : row.amountCents)}
      tone={row.amountCents < 0n ? 'negative' : 'positive'} showSign/> },
    { key: 'action', header: 'Ação', align: 'end', cell: row => <Button size="sm" variant="ghost" onClick={() => setSelected(row)}>
      {view === 'history' ? 'Revisar novamente' : resolutions.get(row.id)?.semanticResolved ? 'Revisar' : 'Vincular'}
    </Button> }
  ];
  const filtered = sortRows((view === 'pending' ? pending : history.filter(row => historyFilter === 'all' || row.classificationStatus === historyFilter))
    .filter(row => matchesTransactionFilters(row, filters)), sort, columns);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize)));
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const active = Boolean(params.get('status')) || Object.values(filters).some(Boolean);

  function change(key: keyof TransactionFilters | 'view' | 'status', value: string) {
    setParams({ [key]: value, ...(key === 'view' && value !== 'history' ? { status: null } : {}) });
    setPage(1);
  }
  const clear = () => { setParams({ q: null, account: null, category: null, nature: null, status: null }); setPage(1); };

  return <div className="template-page">
    <div className="template-heading"><div><p className="eyebrow">REVISÃO</p><h1>Revisão de categorias</h1>
      <p className="muted">Resolva somente o que exige decisão. Confirmações continuam disponíveis no histórico para correção.</p></div>
      <div className="template-heading__actions"><Badge aria-live="polite">{pending.length} pendente{pending.length === 1 ? '' : 's'}</Badge>{headerAction}</div></div>
    <div className="template-metrics" aria-label="Resumo da revisão">
      <MetricCard label="Pendências" value={String(pending.length)} supportingText="Categoria ou vínculo ainda necessário" />
      <MetricCard label="Automáticas" value={String(automatic)} supportingText="Resolvidas por evidência forte" />
      <MetricCard label="Confirmadas" value={String(confirmed)} supportingText="Decisões mantidas no histórico" />
    </div>
    <Card className="template-table-card review-card">
      <div className="review-toolbar">
        <div className="review-tabs" role="tablist" aria-label="Visualização da revisão">
          <Button role="tab" size="sm" variant={view === 'pending' ? 'primary' : 'ghost'} aria-selected={view === 'pending'} onClick={() => change('view', '')}>Pendências ({pending.length})</Button>
          <Button role="tab" size="sm" variant={view === 'history' ? 'primary' : 'ghost'} aria-selected={view === 'history'} onClick={() => change('view', 'history')}>Histórico ({history.length})</Button>
        </div>
      </div>
      <div className="review-filters">
        <TransactionFilterFields filters={filters} active={active} onChange={change} onClear={clear} resultCount={filtered.length}
          accounts={data?.accounts ?? []} categories={data?.categories ?? []} natures={reviewNatures}>
          {view === 'history' && <Select label="Filtrar histórico" value={historyFilter === 'all' ? '' : historyFilter} options={[
            { value: '', label: 'Todos' }, { value: 'automatic', label: 'Automáticos' }, { value: 'confirmed', label: 'Confirmados' }
          ]} onChange={event => change('status', event.target.value)} />}
        </TransactionFilterFields>
      </div>
      <DataState status={ledger.status === 'idle' ? 'loading' : ledger.status} kind="table" rows={5} columns={7}
        errorDescription={ledger.error} onRetry={() => void ledger.reload()}>
        <DataTable ariaLabel={view === 'pending' ? 'Pendências de revisão' : 'Histórico de revisões'} columns={columns} rows={paged}
          getRowKey={row => row.id} sort={sort} onSortChange={setSort}
          emptyTitle={active ? 'Nenhum lançamento corresponde aos filtros' : view === 'pending' ? 'Tudo revisado' : 'Nenhum item no histórico'}
          emptyDescription={active ? 'Altere ou limpe os filtros para ver outros lançamentos.' : view === 'pending' ? 'Novas pendências aparecerão após importações ou sugestões.' : 'Altere o filtro para consultar outras decisões.'}/>
        {filtered.length > pageSize && <Pagination page={currentPage} pageSize={pageSize} totalItems={filtered.length} onPageChange={setPage}/>}
      </DataState>
    </Card>
    <ClassificationReviewForm transaction={selected} onClose={() => setSelected(null)} ledger={ledger}/>
  </div>;
}
