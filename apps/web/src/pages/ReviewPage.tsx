import { useState } from 'react';
import type { TransactionContract } from '@personal-finance/domain';
import { Badge, Button, Card, DataState, DataTable, EmptyState, FinancialValue, MetricCard, Pagination, ReviewIcon, Select, type DataTableColumn } from '@personal-finance/ui';
import type { TransactionClassification } from '../ledger/contracts';
import { formatCentsBRL, formatLocalDate } from '../lib/demo-transactions';
import { reviewResolution } from '../lib/review-queue';
import { ClassificationReviewForm } from '../components/ClassificationReviewForm';
import type { PageProps } from './PageProps';

type ReviewView = 'pending' | 'history';
type HistoryFilter = 'all' | 'automatic' | 'confirmed';
const pageSize = 20;
const natureLabels: Partial<Record<TransactionContract['nature'], string>> = {
  income: 'Receita', expense: 'Despesa', own_transfer: 'Transferência própria', card_payment: 'Pagamento de fatura',
  savings_contribution: 'Aporte', savings_withdrawal: 'Resgate'
};

function confidenceLabel(value: number): string {
  return `${(value / 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
}

export function ReviewPage({ ledger, headerAction }: PageProps) {
  const [selected, setSelected] = useState<TransactionContract | null>(null);
  const [view, setView] = useState<ReviewView>('pending');
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const [page, setPage] = useState(1);
  if (!ledger) return <div className="template-page">
    <div className="template-heading"><div><p className="eyebrow">CATEGORIZAÇÃO</p><h1>Revisão de categorias</h1>
      <p className="muted">Sugestões explicáveis aparecem aqui somente no ambiente autenticado.</p></div><div className="template-heading__actions"><Badge>Modo demonstrativo</Badge>{headerAction}</div></div>
    <Card><EmptyState title="Nenhuma classificação demonstrativa" description="Descrições e evidências bancárias reais nunca entram nos baselines visuais."/></Card>
  </div>;

  const data = ledger.data;
  const classifications = new Map((data?.classifications ?? []).map(item => [item.transactionId, item]));
  const categories = new Map((data?.categories ?? []).map(item => [item.id, item.name]));
  const accounts = new Map((data?.accounts ?? []).map(item => [item.id, item.name]));
  const relations = {
    semanticOverrides: data?.semanticOverrides ?? [], links: data?.links ?? [],
    savingsMovements: data?.savingsMovements ?? [], cardStatementEntries: data?.cardStatementEntries ?? []
  };
  const imported = (data?.transactions ?? []).filter(row => row.source === 'pluggy'
    && row.nature !== 'refund' && row.nature !== 'adjustment');
  const resolutions = new Map(imported.map(row => [row.id, reviewResolution(row, relations)]));
  const pending = imported.filter(row => resolutions.get(row.id)?.pending);
  const history = imported.filter(row => !resolutions.get(row.id)?.pending);
  const filtered = view === 'pending' ? pending : history.filter(row => historyFilter === 'all' || row.classificationStatus === historyFilter);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const automatic = history.filter(row => row.classificationStatus === 'automatic').length;
  const confirmed = history.length - automatic;

  const columns: DataTableColumn<TransactionContract>[] = [
    { key: 'date', header: 'Data', cell: row => formatLocalDate(row.eventDate) },
    { key: 'description', header: 'Lançamento', headerIcon: ReviewIcon, iconTone: 'warning', cell: row => {
      const classification: TransactionClassification | undefined = classifications.get(row.id);
      return <><strong>{row.description}</strong><br/><span className="muted">{accounts.get(row.accountId) ?? 'Conta'}
        {classification?.evidence.length ? ` · ${classification.evidence.map(item => item.label).join(' · ')} · ${confidenceLabel(classification.confidenceBasisPoints)}` : ''}</span></>;
    } },
    { key: 'nature', header: 'Natureza', cell: row => <Badge tone={row.reporting === 'income' ? 'income' : row.reporting === 'expense' ? 'expense' : 'transfer'}>{natureLabels[row.nature] ?? row.nature}</Badge> },
    { key: 'category', header: 'Categoria', cell: row => row.categoryId ? categories.get(row.categoryId) ?? 'Sem categoria' : <span className="muted">Não se aplica</span> },
    { key: 'status', header: 'Situação', cell: row => {
      const resolution = resolutions.get(row.id);
      if (!resolution?.semanticResolved) return <Badge>Vínculo pendente</Badge>;
      if (!resolution.categoryResolved) return <Badge>{row.classificationStatus === 'suggested' ? 'Revisar categoria' : 'Sem categoria'}</Badge>;
      return <Badge>{row.classificationStatus === 'automatic' ? 'Automática' : 'Confirmada'}</Badge>;
    } },
    { key: 'amount', header: 'Valor', align: 'end', cell: row => <FinancialValue value={formatCentsBRL(row.amountCents < 0n ? -row.amountCents : row.amountCents)}
      tone={row.amountCents < 0n ? 'negative' : 'positive'} showSign/> },
    { key: 'action', header: 'Ação', align: 'end', cell: row => <Button size="sm" variant="ghost" onClick={() => setSelected(row)}>
      {view === 'history' ? 'Revisar novamente' : resolutions.get(row.id)?.semanticResolved ? 'Revisar' : 'Vincular'}
    </Button> }
  ];

  function changeView(next: ReviewView) { setView(next); setPage(1); }

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
          <Button role="tab" size="sm" variant={view === 'pending' ? 'primary' : 'ghost'} aria-selected={view === 'pending'} onClick={() => changeView('pending')}>Pendências ({pending.length})</Button>
          <Button role="tab" size="sm" variant={view === 'history' ? 'primary' : 'ghost'} aria-selected={view === 'history'} onClick={() => changeView('history')}>Histórico ({history.length})</Button>
        </div>
        {view === 'history' && <Select label="Filtrar histórico" value={historyFilter} options={[
          { value: 'all', label: 'Todos' }, { value: 'automatic', label: 'Automáticos' }, { value: 'confirmed', label: 'Confirmados' }
        ]} onChange={event => { setHistoryFilter(event.target.value as HistoryFilter); setPage(1); }} />}
      </div>
      <DataState status={ledger.status === 'idle' ? 'loading' : ledger.status} kind="table" rows={5} columns={7}
        errorDescription={ledger.error} onRetry={() => void ledger.reload()}>
        <DataTable ariaLabel={view === 'pending' ? 'Pendências de revisão' : 'Histórico de revisões'} columns={columns} rows={paged}
          getRowKey={row => row.id} emptyTitle={view === 'pending' ? 'Tudo revisado' : 'Nenhum item no histórico'}
          emptyDescription={view === 'pending' ? 'Novas pendências aparecerão após importações ou sugestões.' : 'Altere o filtro para consultar outras decisões.'}/>
        {filtered.length > pageSize && <Pagination page={page} pageSize={pageSize} totalItems={filtered.length} onPageChange={setPage}/>}
      </DataState>
    </Card>
    <ClassificationReviewForm transaction={selected} onClose={() => setSelected(null)} ledger={ledger}/>
  </div>;
}
