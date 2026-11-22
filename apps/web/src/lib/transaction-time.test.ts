import test from 'node:test';
import assert from 'node:assert/strict';
import { formatEventTime } from './transaction-time.ts';

test('hora em Brasília; data sem hora não inventa horário', () => {
  assert.equal(formatEventTime('2026-11-22T17:32:10.000Z'), '14:32');
  assert.equal(formatEventTime('2026-11-22T00:00:00.000Z'), undefined);
  assert.equal(formatEventTime('2026-11-22T03:00:00.000Z'), undefined);
  assert.equal(formatEventTime(undefined), undefined);
  assert.equal(formatEventTime('lixo'), undefined);
});
