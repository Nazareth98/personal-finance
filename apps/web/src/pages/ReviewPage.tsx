import { usePageSize } from '../hooks/usePageSize';
import { useState } from 'react';
import type { TransactionContract } from '@personal-finance/domain';
import { Badge, Button, CalendarIcon, Card, Icon, DataState, DataTable, EmptyState, FinancialValue, Pagination, ReviewIcon, Select, Tabs, sortRows, useToast, type DataTableColumn, type SortState } from '@personal-finance/ui';
import type { TransactionClassification } from '../ledger/contracts';
import { formatCentsBRL } from '../lib/demo-transactions';
import { reviewReason, reviewResolution, reviewableTransactions, suggestedCategoryId, type ReviewReason } from '../lib/review-queue';
import { matchesTransactionFilters, readTransactionFilters, type TransactionFilters } from '../lib/transaction-filters';
import { useHashParams } from '../hooks/useHashParams';
import { ClassificationReviewForm } from '../components/ClassificationReviewForm';
import { TransactionFilterFields, natureLabels } from '../components/TransactionFilterFields';
import type { PageProps } from './PageProps';
import { eventSortKey } from '../lib/transaction-time';
import { DateTime } from '../components/DateTime';
import { InstitutionLogo } from '../components/InstitutionLogo';
import { ReviewPeriodForm } from '../components/ReviewPeriodForm';
import { formatReviewDate, inReviewPeriod } from '../lib/review-period';

type HistoryFilter = 'all' | 'automatic' | 'confirmed';
const reviewNatures: TransactionContract['nature'][] = ['income', 'expense', 'own_transfer', 'card_payment', 'savings_contribution', 'savings_withdrawal'];
const groups: { reason: ReviewReason; title: string; description: string }[] = [
  { reason: 'links', title: 'Vincular', description: 'Sem o outro lado, o valor contaria duas vezes.' },
  { reason: 'categories', title: 'Categorizar', description: 'Confirme a sugestão ou escolha outra categoria; o sistema aprende só depois de confirmar.' }
];

function confidenceLabel(value: number): string {
  return `${(value / 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
}

function Amount({ row }: { row: TransactionContract }) {
  return <FinancialValue value={formatCentsBRL(row.amountCents < 0n ? -row.amountCents : row.amountCents)} tone={row.amountCents < 0n ? 'negative' : 'positive'} showSign/>;
}

type PendingSort = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'description';
const pendingSortOptions: { value: PendingSort; label: string }[] = [
  { value: 'date-desc', label: 'Data (mais recente)' }, { value: 'date-asc', label: 'Data (mais antiga)' },
  { value: 'amount-desc', label: 'Valor (maior)' }, { value: 'amount-asc', label: 'Valor (menor)' }, { value: 'description', label: 'Descrição (A–Z)' }
];
const magnitude = (row: TransactionContract) => row.amountCents < 0n ? -row.amountCents : row.amountCents;
function comparePending(a: TransactionContract, b: TransactionContract, order: PendingSort): number {
  if (order === 'date-asc') return eventSortKey(a).localeCompare(eventSortKey(b));
  if (order === 'amount-desc') return magnitude(b) > magnitude(a) ? 1 : magnitude(b) < magnitude(a) ? -1 : 0;
  if (order === 'amount-asc') return magnitude(a) > magnitude(b) ? 1 : magnitude(a) < magnitude(b) ? -1 : 0;
  if (order === 'description') return a.description.localeCompare(b.description, 'pt-BR');
  return eventSortKey(b).localeCompare(eventSortKey(a));
}

export function ReviewPage({ ledger, headerAction }: PageProps) {
  const [periodOpen, setPeriodOpen] = useState(false);
  const [selected, setSelected] = useState<TransactionContract | null>(null);
  const [confirming, setConfirming] = useState<string>();
  const [params, setParams] = useHashParams();
  const [sort, setSort] = useState<SortState>({ key: 'date', direction: 'desc' });
  // Pendências são uma lista agrupada (não tabela): a ordem vem deste seletor, com as mesmas opções da tabela de Transações.
  const [pendingSort, setPendingSort] = useState<PendingSort>('date-desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize, pageSizeOptions] = usePageSize('review', 20);
  const { notify } = useToast();
  if (!ledger) return <div className="template-page">
    <div className="template-heading"><div><p className="eyebrow">CATEGORIZAÇÃO</p><h1>Revisão de categorias</h1>
      <p className="muted">Depois de entrar, o que o app não conseguiu decidir sozinho aparece aqui.</p></div><div className="template-heading__actions"><Badge>Modo demonstrativo</Badge>{headerAction}</div></div>
    <Card><EmptyState title="Nada para revisar no modo de exemplo" description="Com seus bancos conectados, as dúvidas sobre categorias aparecem aqui."/></Card>
  </div>;

  const view = params.get('view') === 'history' ? 'history' : 'pending';
  const historyFilter = (['automatic', 'confirmed'].includes(params.get('status') ?? '') ? params.get('status') : 'all') as HistoryFilter;
  const reason = (['links', 'categories'].includes(params.get('reason') ?? '') ? params.get('reason') : undefined) as ReviewReason | undefined;
  const filters = readTransactionFilters(params);
  const data = ledger.data;
  const period = { reviewStartDate: data?.reviewStartDate, creditCards: data?.creditCards };
  const earlier = Boolean(data?.reviewStartDate) && params.get('scope') === 'earlier';
  const classifications = new Map((data?.classifications ?? []).map(item => [item.transactionId, item]));
  const categories = new Map((data?.categories ?? []).map(item => [item.id, item.name]));
  const accounts = new Map((data?.accounts ?? []).map(item => [item.id, item.name]));
  const relations = {
    semanticOverrides: data?.semanticOverrides ?? [], links: data?.links ?? [],
    savingsMovements: data?.savingsMovements ?? [], cardStatementEntries: data?.cardStatementEntries ?? []
  };
  const imported = reviewableTransactions(data?.transactions ?? []);
  const resolutions = new Map(imported.map(row => [row.id, reviewResolution(row, relations)]));
  const reasonOf = (row: TransactionContract) => reviewReason(resolutions.get(row.id)!);
  const earlierCount = imported.filter(row => !inReviewPeriod(row, period) && resolutions.get(row.id)?.pending).length;
  const scoped = imported.filter(row => earlier ? !inReviewPeriod(row, period) : inReviewPeriod(row, period));
  const pending = scoped.filter(row => resolutions.get(row.id)?.pending);
  const history = scoped.filter(row => !resolutions.get(row.id)?.pending);
  const statusLabel = (row: TransactionContract) => row.classificationStatus === 'automatic' ? 'Automática' : 'Confirmada';
  const categoryName = (row: TransactionContract) => row.categoryId ? categories.get(row.categoryId) ?? 'Sem categoria' : undefined;
  const evidence = (classification?: TransactionClassification) => classification?.evidence.length
    ? `${confidenceLabel(classification.confidenceBasisPoints)} · ${classification.evidence.map(item => item.label).join(' · ')}` : '';

  const columns: DataTableColumn<TransactionContract>[] = [
    { mobile: 'detail', key: 'date', header: 'Data', sortable: true, sortValue: row => eventSortKey(row), cell: row => <DateTime row={row} /> },
    { mobile: 'primary', key: 'description', header: 'Lançamento', headerIcon: ReviewIcon, iconTone: 'warning', sortable: true, sortValue: row => row.description, cell: row => {
      const detail = evidence(classifications.get(row.id));
      return <span className="ledger-description"><strong>{row.description}</strong><span className="muted ledger-description__account">
        <InstitutionLogo accountId={row.accountId} accountName={accounts.get(row.accountId) ?? 'Conta'} institutions={data?.institutions} size="sm" />
        {accounts.get(row.accountId) ?? 'Conta'}{detail ? ` · ${detail}` : ''}</span></span>;
    } },
    { mobile: 'detail', key: 'nature', header: 'Natureza', sortable: true, sortValue: row => natureLabels[row.nature], cell: row => <Badge tone={row.reporting === 'income' ? 'income' : row.reporting === 'expense' ? 'expense' : 'transfer'}>{natureLabels[row.nature]}</Badge> },
    { mobile: 'detail', key: 'category', header: 'Categoria', sortable: true, sortValue: categoryName, cell: row => categoryName(row) ?? <span className="muted">Não se aplica</span> },
    { mobile: 'footer', key: 'status', header: 'Situação', sortable: true, sortValue: statusLabel, cell: row => <Badge>{statusLabel(row)}</Badge> },
    { mobile: 'value', key: 'amount', header: 'Valor', align: 'end', sortable: true, sortValue: row => row.amountCents, cell: row => <Amount row={row}/> },
    { mobile: 'footer', key: 'action', header: 'Ação', align: 'end', cell: row => <Button size="sm" variant="ghost" onClick={() => setSelected(row)}>Revisar novamente</Button> }
  ];
  const matching = (view === 'pending' ? pending : history.filter(row => historyFilter === 'all' || row.classificationStatus === historyFilter))
    .filter(row => matchesTransactionFilters(row, filters));
  const reasonCounts = { links: matching.filter(row => view === 'pending' && reasonOf(row) === 'links').length, categories: 0 };
  reasonCounts.categories = view === 'pending' ? matching.length - reasonCounts.links : 0;
  const filtered = view === 'pending'
    ? matching.filter(row => !reason || reasonOf(row) === reason).sort((a, b) => comparePending(a, b, pendingSort) || a.id.localeCompare(b.id))
    : sortRows(matching, sort, columns);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize)));
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const active = Boolean(params.get('status')) || Object.values(filters).some(Boolean);

  function change(key: keyof TransactionFilters | 'view' | 'status' | 'reason', value: string) {
    setParams({ [key]: value || null, ...(key === 'view' ? { status: null, reason: null } : {}) });
    setPage(1);
  }
  const clear = () => { setParams({ q: null, account: null, category: null, nature: null, status: null }); setPage(1); };
  async function confirm(row: TransactionContract, categoryId: string) {
    setConfirming(row.id);
    try {
      await ledger!.confirmClassification({ transactionId: row.id, categoryId });
      notify({ message: 'Revisão confirmada e alias aprendido.', tone: 'success' });
    } catch {
      notify({ message: 'Não foi possível confirmar. Use “Alterar” para revisar.', tone: 'error' });
    } finally { setConfirming(undefined); }
  }

  const reasonChips = view === 'pending' && <div className="review-reasons" role="group" aria-label="Motivo">
    {([[undefined, 'Todas', matching.length], ['links', 'Vínculos', reasonCounts.links], ['categories', 'Categorias', reasonCounts.categories]] as const).map(([value, label, count]) =>
      <button key={label} type="button" className="review-reason" aria-pressed={reason === value} onClick={() => change('reason', value ?? '')}>{label} {count}</button>)}
  </div>;
  const emptyTitle = active || reason ? 'Nenhum lançamento corresponde aos filtros' : view === 'pending' ? (data?.reviewStartDate ? 'Tudo revisado neste período' : 'Tudo revisado') : 'Nenhum item no histórico';
  const emptyDescription = active || reason ? 'Altere ou limpe os filtros para ver outros lançamentos.' : view === 'pending' ? 'Quando chegarem lançamentos que o app não souber classificar, eles aparecem aqui.' : 'Altere o filtro para consultar outras decisões.';

  return <div className="template-page">
    <div className="template-heading"><div><p className="eyebrow">REVISÃO</p><h1>Revisão de categorias</h1>
      <p className="muted">Só o que o app não conseguiu decidir sozinho. Mudou de ideia? Corrija pelo histórico.</p></div>
      <div className="template-heading__actions">{headerAction}</div></div>
    {ledger.status === 'success' && <div className="review-period" role="group" aria-label="Período de revisão">
      <Icon icon={CalendarIcon} size="sm" />
      <p>{earlier
        ? <>Mostrando o que é <strong>anterior a {formatReviewDate(data!.reviewStartDate!)}</strong></>
        : data?.reviewStartDate
          ? <>Revisando a partir de <strong>{formatReviewDate(data.reviewStartDate)}</strong>
            {earlierCount > 0 && <span className="muted"> · {earlierCount} {earlierCount === 1 ? 'pendência anterior' : 'pendências anteriores'}</span>}</>
          : <>Revisando <strong>todo o histórico</strong></>}</p>
      <div className="review-period__actions">
        {data?.reviewStartDate && (earlier || earlierCount > 0) && <Button variant="ghost" size="sm" onClick={() => {
          setParams({ scope: earlier ? null : 'earlier', q: null, account: null, category: null, nature: null, reason: null, view: null, status: null });
          setPage(1);
        }}>{earlier ? 'Voltar ao período' : 'Ver anteriores'}</Button>}
        <Button variant="secondary" size="sm" onClick={() => setPeriodOpen(true)}>Alterar</Button>
      </div>
    </div>}
    <Tabs label="Visualização da revisão" className="review-view-tabs" panelClassName="review-panel" selectedId={view}
      onSelect={id => change('view', id === 'history' ? 'history' : '')}
      items={[{ id: 'pending', label: <strong>Pendências · {pending.length}</strong> }, { id: 'history', label: <strong>Histórico · {history.length}</strong> }]}>
      <TransactionFilterFields collapsible toolbar={reasonChips} filters={filters} active={active} onChange={change} onClear={clear} resultCount={filtered.length}
        extraActiveCount={view === 'history' && historyFilter !== 'all' ? 1 : 0}
        accounts={data?.accounts ?? []} categories={data?.categories ?? []} natures={reviewNatures}>
        {view === 'pending' && <Select label="Ordenar por" value={pendingSort} options={pendingSortOptions}
          onChange={event => { setPendingSort(event.target.value as PendingSort); setPage(1); }} />}
        {view === 'history' && <Select label="Filtrar histórico" value={historyFilter === 'all' ? '' : historyFilter} options={[
          { value: '', label: 'Todos' }, { value: 'automatic', label: 'Automáticos' }, { value: 'confirmed', label: 'Confirmados' }
        ]} onChange={event => change('status', event.target.value)} />}
      </TransactionFilterFields>
      <DataState status={ledger.status === 'idle' ? 'loading' : ledger.status} kind="table" rows={5} columns={7}
        errorDescription={ledger.error} onRetry={() => void ledger.reload()}>
        {view === 'history'
          ? <Card className="template-table-card review-card"><DataTable ariaLabel="Histórico de revisões" columns={columns} rows={paged} getRowKey={row => row.id} sort={sort} onSortChange={setSort}
            emptyTitle={emptyTitle} emptyDescription={emptyDescription}/></Card>
          : paged.length === 0
            ? <Card><EmptyState title={emptyTitle} description={emptyDescription}/></Card>
            : groups.map(group => {
              const rows = paged.filter(row => reasonOf(row) === group.reason);
              if (!rows.length) return null;
              const headingId = `review-group-${group.reason}`;
              return <Card key={group.reason} className="review-group" aria-labelledby={headingId}>
                <div className="review-group__header"><h2 id={headingId}>{group.title} · {rows.length}</h2><p className="muted">{group.description}</p></div>
                <ul>{rows.map(row => {
                  const classification = classifications.get(row.id);
                  const suggestion = group.reason === 'categories' ? suggestedCategoryId(row, classification?.categoryId) : undefined;
                  return <li key={row.id} className={`review-item review-item--${group.reason}`}>
                    <span className="muted review-item__date"><DateTime row={row} /></span>
                    <span className="review-item__main"><strong>{row.description}</strong>
                      <span className="muted ledger-description__account"><InstitutionLogo accountId={row.accountId} accountName={accounts.get(row.accountId) ?? 'Conta'} institutions={data?.institutions} size="sm" />
                        {accounts.get(row.accountId) ?? 'Conta'} · <span className="review-item__nature">{natureLabels[row.nature]}</span></span></span>
                    {group.reason === 'categories' && <span className="review-item__suggestion">{suggestion
                      ? <><span>Sugestão: <strong>{categories.get(suggestion) ?? 'Categoria'}</strong></span><span className="muted">{evidence(classification)}</span></>
                      : <span className="muted">Sem sugestão</span>}</span>}
                    <span className="review-item__amount"><Amount row={row}/></span>
                    <span className="review-item__actions">
                      {group.reason === 'links' && <Button variant="secondary" onClick={() => setSelected(row)}>Vincular</Button>}
                      {group.reason === 'categories' && <Button variant="secondary" onClick={() => setSelected(row)}>{suggestion ? 'Alterar' : 'Escolher categoria'}</Button>}
                      {suggestion && <Button loading={confirming === row.id} disabled={Boolean(confirming)} aria-label={`Confirmar ${categories.get(suggestion) ?? 'categoria'} para ${row.description}`}
                        onClick={() => void confirm(row, suggestion)}>Confirmar</Button>}
                    </span>
                  </li>;
                })}</ul>
              </Card>;
            })}
        {filtered.length > pageSizeOptions[0]! && <Pagination page={currentPage} pageSize={pageSize} totalItems={filtered.length} onPageChange={setPage}
          pageSizeOptions={pageSizeOptions} onPageSizeChange={size => { setPageSize(size); setPage(1); }}/>}
      </DataState>
    </Tabs>
    <ClassificationReviewForm transaction={selected} onClose={() => setSelected(null)} ledger={ledger}/>
    <ReviewPeriodForm open={periodOpen} onClose={() => setPeriodOpen(false)} ledger={ledger}
      onSaved={() => { setParams({ scope: null }); setPage(1); }}/>
  </div>;
}
