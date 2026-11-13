import assert from 'node:assert/strict';
import test from 'node:test';
import { isBudgetCategory, parsePercentageBasisPoints } from './budget-validation.ts';

test('converte percentual pt-BR em pontos-base sem ponto flutuante', () => {
  assert.equal(parsePercentageBasisPoints('12,50'), 1250);
  assert.equal(parsePercentageBasisPoints('0,01'), 1);
  assert.equal(parsePercentageBasisPoints('100'), 10000);
});

test('rejeita percentual inválido ou fora do intervalo', () => {
  for (const value of ['', '0', '100,01', '-1', '10,123', 'dez']) {
    assert.equal(parsePercentageBasisPoints(value), null, value);
  }
});

test('restringe metas a categorias de despesa', () => {
  assert.equal(isBudgetCategory('groceries'), true);
  assert.equal(isBudgetCategory('salary'), false);
  assert.equal(isBudgetCategory('transfers'), false);
});
