import assert from 'node:assert/strict';
import test from 'node:test';
import type { PluggyConnection } from '../integrations/contracts.ts';
import { connectionsDue } from './auto-sync.ts';

const now = Date.parse('2026-11-19T18:00:00Z');
const base: PluggyConnection = { id: 'a', institutionName: 'Banco', status: 'ready', lastAttemptAt: '2026-11-19T08:00:00Z' };

test('sincroniza ao abrir só o que não foi tentado nas últimas 6 h (D-061)', () => {
  const due = connectionsDue([
    base,
    { ...base, id: 'b', lastAttemptAt: '2026-11-19T15:00:00Z' },
    { ...base, id: 'c', status: 'error' },
    { ...base, id: 'd', status: 'login_required' },
    { ...base, id: 'e', status: 'updating' },
    { id: 'f', institutionName: 'Banco', status: 'ready' }
  ], now);
  assert.deepEqual(due.map(connection => connection.id), ['a', 'c', 'f']);
});
