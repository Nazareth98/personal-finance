import { useState } from 'react';
import { Badge, Button, Card, ConnectionsIcon, DataState, DataTable, EmptyState, Icon, PlusIcon, useToast, type DataTableColumn } from '@personal-finance/ui';
import type { PluggyConnection } from '../integrations/contracts';
import type { ConnectionsState } from '../integrations/useConnections';
import { formatDateTime } from '../lib/demo-transactions';
import type { PageProps } from './PageProps';

const statusLabels: Record<PluggyConnection['status'], string> = {
  pending: 'Pendente', updating: 'Atualizando', ready: 'Atualizada', error: 'Com erro', login_required: 'Reconexão necessária'
};

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
  const columns: DataTableColumn<PluggyConnection>[] = [
    { key: 'institution', header: 'Instituição', headerIcon: ConnectionsIcon, iconTone: 'transfer', sortable: true, sortValue: row => row.institutionName, cell: row => <strong>{row.institutionName}</strong> },
    { key: 'status', header: 'Estado', sortable: true, sortValue: row => statusLabels[row.status], cell: row => <Badge>{statusLabels[row.status]}</Badge> },
    // Timestamps ISO em UTC ordenam cronologicamente como texto; ausentes ficam por último.
    { key: 'source', header: 'Atualização da fonte', sortable: true, sortValue: row => row.lastSourceUpdatedAt, cell: row => dateTime(row.lastSourceUpdatedAt) },
    { key: 'attempt', header: 'Última tentativa', sortable: true, sortValue: row => row.lastAttemptAt, cell: row => dateTime(row.lastAttemptAt) },
    { key: 'success', header: 'Última importação', sortable: true, sortValue: row => row.lastSuccessAt, cell: row => dateTime(row.lastSuccessAt) },
    { key: 'action', header: 'Ação', align: 'end', cell: row => <Button size="sm" variant="ghost" loading={syncingId === row.id} onClick={() => void sync(row.id)}>Sincronizar agora</Button> }
  ];
  return <div className="template-page">
    <div className="template-heading"><div><p className="eyebrow">AUTOMAÇÃO</p><h1>Conexões bancárias</h1>
      <p className="muted">O MeuPluggy atualiza a fonte; “Sincronizar agora” busca o dado mais recente já disponível.</p></div>
      <div className="template-heading__actions"><Button variant="secondary" loading={connecting} onClick={() => void connect()}><Icon icon={PlusIcon} size="sm"/>Conectar instituição</Button>{headerAction}</div></div>
    {connections.error && <p className="sample-warning" role="alert">{connections.error}</p>}
    <Card className="template-table-card"><DataState status={connections.status === 'idle' ? 'loading' : connections.status} kind="table" rows={3} columns={6} errorDescription={connections.error} onRetry={() => void connections.reload()}>
      {rows.length
        ? <DataTable ariaLabel="Conexões MeuPluggy" columns={columns} rows={rows} getRowKey={row => row.id}/>
        : <EmptyState title="Nenhuma instituição conectada" description="Conecte Nubank, Caixa ou Itaú para importar o histórico disponível." action={<Button onClick={() => void connect()}>Conectar instituição</Button>}/>} 
    </DataState></Card>
    {rows.some(row => row.lastError) && <Card><h2>Últimos erros</h2>{rows.filter(row => row.lastError).map(row => <p className="muted" key={row.id}><strong>{row.institutionName}:</strong> não foi possível concluir a última tentativa. Tente sincronizar novamente ou reconecte a instituição.</p>)}</Card>}
  </div>;
}
