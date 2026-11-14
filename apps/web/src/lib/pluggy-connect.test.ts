import assert from 'node:assert/strict';
import test from 'node:test';
import { extractPluggyItemId } from '../integrations/useConnections.ts';

test('aceita os formatos de sucesso documentados e legados do Connect', () => {
  assert.equal(extractPluggyItemId({ item: { id: 'item-1' } }), 'item-1');
  assert.equal(extractPluggyItemId({ itemId: 'item-2' }), 'item-2');
  assert.equal(extractPluggyItemId({ id: 'item-3' }), 'item-3');
});
