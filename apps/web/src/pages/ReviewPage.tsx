import { useState } from 'react';
import type { TransactionContract } from '@personal-finance/domain';
import { Badge, Button, Card, DataState, DataTable, EmptyState, MetricCard, type DataTableColumn } from '@personal-finance/ui';
import type { LedgerState } from '../ledger/useLedger';
import type { TransactionClassification } from '../ledger/contracts';
import { formatLocalDate } from '../lib/demo-transactions';
import { ClassificationReviewForm } from '../components/ClassificationReviewForm';
import type { PageProps } from './PageProps';

function confidenceLabel(value: number): string {
  return `${(value / 100).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`;
}

export function ReviewPage({ ledger, headerAction }: PageProps) {
  const [selected, setSelected] = useState<TransactionContract | null>(null);
  if (!ledger) return <div className="template-page">
    <div className="template-heading"><div><p className="eyebrow">CATEGORIZAÇÃO</p><h1>Revisão de categorias</h1>
      <p className="muted">Sugestões explicáveis aparecem aqui somente no ambiente autenticado.</p></div><div className="template-heading__actions"><Badge>Modo demonstrativo</Badge>{headerAction}</div></div>
    <Card><EmptyState title="Nenhuma classificação demonstrativa" description="Descrições e evidências bancárias reais nunca entram nos baselines visuais."/></Card>
  </div>;

  const data = ledger.data;
  const classifications = new Map((data?.classifications ?? []).map(item => [item.transactionId, item]));
  const categories = new Map((data?.categories ?? []).map(item => [item.id, item.name]));
  const imported = (data?.transactions ?? []).filter(row => row.source === 'pluggy' && (row.nature === 'income' || row.nature === 'expense'));
  const pending = imported.filter(row => row.classificationStatus === 'suggested' || row.classificationStatus === 'uncategorized');
  const count = (status: TransactionContract['classificationStatus']) => imported.filter(row => row.classificationStatus === status).length;
  const statusLabels: Record<TransactionContract['classificationStatus'], string> = {
    automatic: 'Automática', suggested: 'Revisar', uncategorized: 'Sem categoria', confirmed: 'Confirmada'
  };
  const columns: DataTableColumn<TransactionContract>[] = [
    { key: 'date', header: 'Data', cell: row => formatLocalDate(row.eventDate) },
    { key: 'description', header: 'Lançamento', cell: row => <strong>{row.description}</strong> },
    { key: 'suggestion', header: 'Sugestão', cell: row => row.categoryId ? categories.get(row.categoryId) ?? 'Sem categoria' : 'Sem categoria' },
    { key: 'status', header: 'Estado', cell: row => <Badge>{statusLabels[row.classificationStatus]}</Badge> },
    { key: 'confidence', header: 'Confiança', align: 'end', cell: row => confidenceLabel(classifications.get(row.id)?.confidenceBasisPoints ?? 0) },
    { key: 'evidence', header: 'Explicação', cell: row => {
      const classification: TransactionClassification | undefined = classifications.get(row.id);
      return classification?.evidence.length
        ? <span className="muted">{classification.evidence.map(item => item.label).join(' · ')}<br/>Versão {classification.classifierVersion}</span>
        : <span className="muted">Evidência insuficiente para sugerir.</span>;
    } },
    { key: 'action', header: 'Ação', align: 'end', cell: row => <Button size="sm" variant="ghost" onClick={() => setSelected(row)}>{row.classificationStatus === 'suggested' || row.classificationStatus === 'uncategorized' ? 'Revisar' : 'Corrigir'}</Button> }
  ];
  return <div className="template-page">
    <div className="template-heading"><div><p className="eyebrow">CATEGORIZAÇÃO</p><h1>Revisão de categorias</h1>
      <p className="muted">Cada sugestão mostra confiança e evidências. Correções confirmadas criam aliases reproduzíveis.</p></div><div className="template-heading__actions"><Badge>{pending.length} pendente{pending.length === 1 ? '' : 's'}</Badge>{headerAction}</div></div>
    <div className="template-metrics">
      <MetricCard label="Automáticas (90–100%)" value={String(count('automatic'))} supportingText="Aplicadas por evidência forte" />
      <MetricCard label="Para revisão (70–89%)" value={String(count('suggested'))} supportingText="Exigem confirmação" />
      <MetricCard label="Sem categoria (<70%)" value={String(count('uncategorized'))} supportingText="Nenhuma decisão é inventada" />
    </div>
    <Card className="template-table-card"><DataState status={ledger.status === 'idle' ? 'loading' : ledger.status} kind="table" rows={5} columns={7}
      errorDescription={ledger.error} onRetry={() => void ledger.reload()}>
      {imported.length
        ? <DataTable ariaLabel="Classificações de lançamentos importados" columns={columns} rows={imported} getRowKey={row => row.id}/>
        : <EmptyState title="Nenhuma classificação disponível" description="Classificações aparecerão após novas importações."/>}
    </DataState></Card>
    <ClassificationReviewForm transaction={selected} onClose={() => setSelected(null)} ledger={ledger}/>
  </div>;
}
