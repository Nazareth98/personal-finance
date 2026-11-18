import { useState } from 'react';
import { Badge, Button, Card, DataState, EmptyState, Icon, StatusAlertIcon, StatusOkIcon, StatusPendingIcon, SyncIcon, useToast, type LucideIcon } from '@personal-finance/ui';
import type { PluggyConnection, SyncRun } from '../integrations/contracts';
import { buildConnectionPanels, type ConnectionGroupKind } from '../lib/connection-panels';
import type { ConnectionsState } from '../integrations/useConnections';
import { formatDateTime } from '../lib/demo-transactions';
import type { PageProps } from './PageProps';
import { PageAction } from '../components/PageAction';

const statusLabels: Record<PluggyConnection['status'], string> = {
  pending: 'Pendente', updating: 'Atualizando', ready: 'Atualizada', error: 'Com erro', login_required: 'Reconexão necessária'
};

const groupCopy: Record<ConnectionGroupKind, { title: string; icon: LucideIcon; tone: string; color: string }> = {
  attention: { title: 'Precisa de atenção', icon: StatusAlertIcon, tone: 'approaching', color: 'chart-category-4' },
  updating: { title: 'Atualizando', icon: StatusPendingIcon, tone: 'within', color: 'chart-category-1' },
  ready: { title: 'Atualizadas', icon: StatusOkIcon, tone: 'success', color: 'chart-category-2' }
};

function countLabel(count: number, singular: string, plural: string) {
  return `${count.toLocaleString('pt-BR')} ${count === 1 ? singular : plural}`;
}

function dateTime(value?: string): string {
  return value ? formatDateTime(value) : 'Ainda não ocorreu';
}

export function ConnectionsPage({ connections, headerAction }: PageProps) {
  const [connecting, setConnecting] = useState(false);
  const [syncingId, setSyncingId] = useState('');
  const { notify } = useToast();
  if (!connections) return <div className="template-page">
    <div className="template-heading"><div><p className="eyebrow">AUTOMAÇÃO</p><h1>Conexões bancárias</h1>
      <p className="muted">Nubank, Caixa e Itaú serão conectados exclusivamente pelo MeuPluggy no ambiente autenticado.</p></div><div className="template-heading__actions"><Badge>Modo demonstrativo</Badge>{headerAction}</div></div>
    <Card><EmptyState title="Nenhuma conexão no modo demonstrativo" description="Credenciais e dados bancários nunca são carregados nesta visualização." /></Card>
  </div>;

  const rows = connections.data?.connections ?? [];
  async function connect() {
    setConnecting(true);
    try { await connections?.connect(); }
    catch { notify({ message: 'Não foi possível concluir a conexão. Tente novamente.', tone: 'error' }); }
    finally { setConnecting(false); }
  }
  async function sync(id: string) {
    setSyncingId(id);
    try { await connections?.sync(id); }
    catch { /* feedback persistente vem do estado */ }
    finally { setSyncingId(''); }
  }
  const panels = buildConnectionPanels(rows, connections.data?.runs ?? []);
  const lastRunText = (run?: SyncRun) => !run ? 'Nenhuma execução registrada ainda.'
    : run.status === 'failed' ? `Última execução em ${formatDateTime(run.createdAt)} não terminou. Tente sincronizar de novo.`
      : run.status === 'succeeded' ? `Última execução: ${countLabel(run.importedTransactions, 'novo lançamento', 'novos lançamentos')}, ${countLabel(run.skippedTransactions, 'já existente', 'já existentes')}.`
        : 'Execução em andamento.';
  return <div className="template-page">
    <div className="template-heading"><div><p className="eyebrow">AUTOMAÇÃO</p><h1>Conexões bancárias</h1>
      <p className="muted">O MeuPluggy atualiza a fonte; “Sincronizar agora” busca o dado mais recente já disponível.</p></div>
      <div className="template-heading__actions"><PageAction label="Conectar instituição" loading={connecting} onClick={() => void connect()} />{headerAction}</div></div>
    {connections.error && connections.status !== 'error' && <p className="sample-warning" role="alert">{connections.error}</p>}
    <section className="summary-strip" aria-label="Resumo das conexões">
      <div><span className="muted">Instituições</span><strong>{panels.total}</strong><span className="muted">Pelo MeuPluggy</span></div>
      <div><span className="muted">Atualizadas</span><strong>{panels.readyCount}</strong><span className="muted">Prontas para importar</span></div>
      <div><span className="muted">Última importação</span><strong>{panels.lastSuccessAt ? formatDateTime(panels.lastSuccessAt) : '—'}</strong>
        <span className="muted">{panels.lastSuccessRun ? countLabel(panels.lastSuccessRun.importedTransactions, 'novo lançamento', 'novos lançamentos') : 'Nenhuma ainda'}</span></div>
      <div><span className="muted">Precisam de atenção</span><strong className={panels.attentionCount ? 'status-tone--approaching' : undefined}>{panels.attentionCount}</strong>
        <span className="muted">{panels.attentionCount ? 'Veja o card da instituição' : 'Tudo certo'}</span></div>
    </section>
    <DataState status={connections.status === 'idle' ? 'loading' : connections.status} kind="table" rows={3} columns={3} errorDescription={connections.error} onRetry={() => void connections.reload()}>
      {rows.length === 0
        ? <EmptyState title="Nenhuma instituição conectada" description="Conecte Nubank, Caixa ou Itaú para importar o histórico disponível." action={<Button onClick={() => void connect()}>Conectar instituição</Button>} />
        : panels.groups.map(group => {
          const copy = groupCopy[group.kind];
          return <section key={group.kind} className="status-group" aria-labelledby={`connections-group-${group.kind}`}>
            <h2 id={`connections-group-${group.kind}`} className={`status-group__title status-tone--${copy.tone}`}><Icon icon={copy.icon} size="sm" />{copy.title}<span className="muted"> · {group.items.length}</span></h2>
            <div className="goal-grid">{group.items.map(({ connection, lastRun }) => <Card key={connection.id} className={`budget-card goal-card ${group.kind === 'attention' ? 'goal-card--warning' : ''}`}>
              <div className="budget-card__top">
                <span className={`category-identity__icon category-identity__icon--${copy.color}`} aria-hidden="true"><Icon icon={copy.icon} size="sm" /></span>
                <div className="budget-card__title"><h3>{connection.institutionName}</h3><span className={`status-tone--${copy.tone}`}>{statusLabels[connection.status]}</span></div>
              </div>
              <div className="budget-card__result"><span className="muted">Última importação</span><strong>{connection.lastSuccessAt ? formatDateTime(connection.lastSuccessAt) : 'Ainda não ocorreu'}</strong></div>
              <dl className="connection-times">
                <div><dt>Fonte atualizada</dt><dd>{dateTime(connection.lastSourceUpdatedAt)}</dd></div>
                <div><dt>Última tentativa</dt><dd>{dateTime(connection.lastAttemptAt)}</dd></div>
              </dl>
              {group.kind === 'attention'
                ? <p className="connection-alert">{connection.status === 'login_required'
                  ? 'A instituição pediu um novo login no MeuPluggy. Entre novamente por lá e depois sincronize; nada do que já foi importado se perde.'
                  : 'A última tentativa não terminou. Sincronize de novo; se persistir, conecte a instituição novamente.'}</p>
                : <p className="budget-card__pace muted">{lastRunText(lastRun)}</p>}
              <div className="goal-card__actions goal-card__actions--links">
                <Button variant="secondary" size="sm" loading={syncingId === connection.id} onClick={() => void sync(connection.id)}><Icon icon={SyncIcon} size="sm" />Sincronizar agora</Button>
              </div>
            </Card>)}</div>
          </section>;
        })}
    </DataState>
    <p className="muted connection-note">Detalhes técnicos de erro ficam só no backend. A sincronização é manual até o webhook do MeuPluggy ser ativado.</p>
  </div>;
}
