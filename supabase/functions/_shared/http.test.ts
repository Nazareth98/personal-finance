import assert from 'node:assert/strict';
import test from 'node:test';
import { safeError } from './http.ts';

test('preserva mensagens de Error e de erros estruturados do Supabase', () => {
  assert.equal(safeError(new Error('sync_failed')), 'sync_failed');
  assert.equal(safeError({ code: '42P10', message: 'conflict_constraint_missing' }), 'conflict_constraint_missing');
});

test('sanitiza a mensagem e usa fallback para valores desconhecidos', () => {
  assert.equal(safeError({ message: 'linha 1\nlinha 2' }), 'linha 1 linha 2');
  assert.equal(safeError({ message: 42 }), 'unexpected_error');
  assert.equal(safeError('erro'), 'unexpected_error');
  assert.equal(safeError(new Error('x'.repeat(300))).length, 240);
});
