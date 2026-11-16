import { useState } from 'react';
import { Badge, Button, Card, DataState, DataTable, EmptyState, Icon, PlusIcon, type DataTableColumn } from '@personal-finance/ui';
import type { PluggyConnection } from '../integrations/contracts';
import type { ConnectionsState } from '../integrations/useConnections';

const statusLabels: Record<PluggyConnection['status'], string> = {
  pending: 'Pendente', updating: 'Atualizando', ready: 'Atualizada', error: 'Com erro', login_required: 'Reconexão necessária'
};

function dateTime(value?: string): string {
  return value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : 'Ainda não ocorreu';
}

export function ConnectionsPage({ connections }: { connections?: ConnectionsState }) {
  const [connecting, setConnecting] = useState(false);
  const [syncingId, setSyncingId] = useState('');
  if (!connections) return <div className="template-page">
    <div className="template-heading"><div><p className="eyebrow">AUTOMAÇÃO</p><h1>Conexões bancárias</h1>
      <p className="muted">Nubank, Caixa e Itaú serão conectados exclusivamente pelo MeuPluggy no ambiente autenticado.</p></div><Badge>Modo demonstrativo</Badge></div>
    <Card><EmptyState title="Nenhuma conexão no modo demonstrativo" description="Credenciais e dados bancários nunca são carregados nesta visualização." /></Card>
  </div>;

  const rows = connections.data?.connections ?? [];
  async function connect() {
    setConnecting(true);
    try { await connections?.connect(); }
    finally { setConnecting(false); }
  }
  async function sync(id: string) {
    setSyncingId(id);
    try { await connections?.sync(id); }
    catch { /* feedback persistente vem do estado */ }
    finally { setSyncingId(''); }
  }
  const columns: DataTableColumn<PluggyConnection>[] = [
    { key: 'institution', header: 'Instituição', cell: row => <strong>{row.institutionName}</strong> },
    { key: 'status', header: 'Estado', cell: row => <Badge>{statusLabels[row.status]}</Badge> },
    { key: 'source', header: 'Atualização da fonte', cell: row => dateTime(row.lastSourceUpdatedAt) },
    { key: 'attempt', header: 'Última tentativa', cell: row => dateTime(row.lastAttemptAt) },
    { key: 'success', header: 'Última importação', cell: row => dateTime(row.lastSuccessAt) },
    { key: 'action', header: 'Ação', align: 'end', cell: row => <Button size="sm" variant="ghost" loading={syncingId === row.id} onClick={() => void sync(row.id)}>Sincronizar agora</Button> }
  ];
  return <div className="template-page">
    <div className="template-heading"><div><p className="eyebrow">AUTOMAÇÃO</p><h1>Conexões bancárias</h1>
      <p className="muted">O MeuPluggy atualiza a fonte; “Sincronizar agora” busca o dado mais recente já disponível.</p></div>
      <Button loading={connecting} onClick={() => void connect()}><Icon icon={PlusIcon} size="sm"/>Conectar instituição</Button></div>
    {connections.error && <p className="sample-warning" role="alert">{connections.error}</p>}
    <Card className="template-table-card"><DataState status={connections.status === 'idle' ? 'loading' : connections.status} kind="table" rows={3} columns={6} errorDescription={connections.error} onRetry={() => void connections.reload()}>
      {rows.length
        ? <DataTable ariaLabel="Conexões MeuPluggy" columns={columns} rows={rows} getRowKey={row => row.id}/>
        : <EmptyState title="Nenhuma instituição conectada" description="Conecte Nubank, Caixa ou Itaú para importar o histórico disponível." action={<Button onClick={() => void connect()}>Conectar instituição</Button>}/>} 
    </DataState></Card>
    {rows.some(row => row.lastError) && <Card><h2>Últimos erros</h2>{rows.filter(row => row.lastError).map(row => <p className="muted" key={row.id}><strong>{row.institutionName}:</strong> não foi possível concluir a última tentativa. Tente sincronizar novamente ou reconecte a instituição.</p>)}</Card>}
  </div>;
}
