import type { PluggyConnection, SyncRun } from '../integrations/contracts.ts';

export type ConnectionGroupKind = 'attention' | 'updating' | 'ready';
const order: readonly ConnectionGroupKind[] = ['attention', 'updating', 'ready'];

export type ConnectionCardView = { connection: PluggyConnection; group: ConnectionGroupKind; lastRun?: SyncRun };

export type ConnectionPanels = {
  total: number;
  readyCount: number;
  attentionCount: number;
  /** Importação mais recente entre as conexões e a execução que a produziu. */
  lastSuccessAt?: string;
  lastSuccessRun?: SyncRun;
  groups: { kind: ConnectionGroupKind; items: ConnectionCardView[] }[];
};

/** Erro, login pendente ou mensagem de erro na última tentativa pedem ação, mesmo com status “pronto”. */
export function connectionGroup(connection: PluggyConnection): ConnectionGroupKind {
  if (connection.status === 'error' || connection.status === 'login_required' || connection.lastError) return 'attention';
  if (connection.status === 'pending' || connection.status === 'updating') return 'updating';
  return 'ready';
}

export function buildConnectionPanels(connections: readonly PluggyConnection[], runs: readonly SyncRun[]): ConnectionPanels {
  const latestRun = new Map<string, SyncRun>();
  for (const run of runs) {
    const current = latestRun.get(run.connectionId);
    if (!current || run.createdAt > current.createdAt) latestRun.set(run.connectionId, run);
  }
  const cards = connections.map(connection => ({ connection, group: connectionGroup(connection), lastRun: latestRun.get(connection.id) }));
  const lastSuccessAt = connections.reduce<string | undefined>((latest, row) => row.lastSuccessAt && (!latest || row.lastSuccessAt > latest) ? row.lastSuccessAt : latest, undefined);
  const lastSuccessRun = runs.filter(run => run.status === 'succeeded').sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  return {
    total: connections.length,
    readyCount: cards.filter(card => card.group === 'ready').length,
    attentionCount: cards.filter(card => card.group === 'attention').length,
    lastSuccessAt, lastSuccessRun,
    groups: order.map(kind => ({ kind, items: cards.filter(card => card.group === kind)
      .sort((a, b) => a.connection.institutionName.localeCompare(b.connection.institutionName, 'pt-BR')) }))
      .filter(group => group.items.length > 0)
  };
}
