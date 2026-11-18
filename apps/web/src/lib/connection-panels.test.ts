import test from 'node:test';
import assert from 'node:assert/strict';
import { buildConnectionPanels } from './connection-panels.ts';
import type { PluggyConnection, SyncRun } from '../integrations/contracts.ts';

const connections: PluggyConnection[] = [
  { id: 'a', institutionName: 'Banco B', status: 'ready', lastSuccessAt: '2026-11-18T17:32:00Z' },
  { id: 'b', institutionName: 'Banco A', status: 'login_required', lastSuccessAt: '2026-11-15T12:10:00Z' },
  { id: 'c', institutionName: 'Banco C', status: 'ready', lastError: 'falha', lastSuccessAt: '2026-11-17T10:00:00Z' },
  { id: 'd', institutionName: 'Banco D', status: 'updating' }
];
const run = (id: string, connectionId: string, status: SyncRun['status'], createdAt: string, importedTransactions = 0): SyncRun =>
  ({ id, connectionId, status, trigger: 'manual', importedAccounts: 0, importedTransactions, skippedTransactions: 0, createdAt });
const runs = [run('r1', 'a', 'succeeded', '2026-11-18T17:30:00Z', 38), run('r0', 'a', 'failed', '2026-11-18T10:00:00Z'), run('r2', 'b', 'failed', '2026-11-18T17:31:00Z')];

test('erro ou login pendente pedem atenção, mesmo com status pronto; a última execução vem por conexão', () => {
  const panels = buildConnectionPanels(connections, runs);
  assert.deepEqual(panels.groups.map(group => [group.kind, group.items.map(item => item.connection.institutionName)]),
    [['attention', ['Banco A', 'Banco C']], ['updating', ['Banco D']], ['ready', ['Banco B']]]);
  assert.deepEqual([panels.total, panels.readyCount, panels.attentionCount], [4, 1, 2]);
  assert.equal(panels.lastSuccessAt, '2026-11-18T17:32:00Z');
  assert.equal(panels.lastSuccessRun?.importedTransactions, 38);
  assert.equal(panels.groups[2]!.items[0]!.lastRun?.id, 'r1');
});
