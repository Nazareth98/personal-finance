import assert from 'node:assert/strict';
import test from 'node:test';
import { isBudgetCategory } from './budget-validation.ts';



test('restringe metas a categorias de despesa', () => {
  assert.equal(isBudgetCategory('groceries'), true);
  assert.equal(isBudgetCategory('salary'), false);
  assert.equal(isBudgetCategory('transfers'), false);
});
