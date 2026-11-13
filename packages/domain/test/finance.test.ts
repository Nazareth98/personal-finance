import assert from 'node:assert/strict';
import test from 'node:test';
import { isConsumption, requireNonZeroCents, transactionNatures } from '../src/index.ts';

test('mantém naturezas patrimoniais fora do consumo', () => {
  assert.equal(isConsumption('expense'), true);
  for (const nature of transactionNatures.filter(item => item !== 'expense')) {
    assert.equal(isConsumption(nature), false, nature);
  }
});

test('rejeita lançamento financeiro de valor zero', () => {
  assert.equal(requireNonZeroCents(1250n), 1250n);
  assert.throws(() => requireNonZeroCents(0n), RangeError);
});
