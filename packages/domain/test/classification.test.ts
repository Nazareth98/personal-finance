import assert from 'node:assert/strict';
import test from 'node:test';
import { classificationTokens, classifyTransaction, normalizeClassificationText, type ClassificationRule } from '../src/index.ts';

const candidate = { description: 'IFOOD * RESTAURANTE 987654', merchant: 'iFood', accountId: 'account-1', nature: 'expense' as const };
const rule = (id: string, categoryId: string, kind: ClassificationRule['kind'], value: string, weightBasisPoints: number): ClassificationRule =>
  ({ id, categoryId, kind, value, weightBasisPoints });

test('normaliza acentos, pontuação e códigos voláteis de forma reproduzível', () => {
  assert.equal(normalizeClassificationText('  São João #123456  '), 'sao joao');
  assert.deepEqual(classificationTokens('Compra no RESTAURANTE e restaurante 9988'), ['compra', 'restaurante']);
});

test('soma evidências da mesma categoria e explica aplicação automática', () => {
  const result = classifyTransaction(candidate, [
    rule('merchant', 'delivery', 'merchant', 'IFOOD', 6500),
    rule('token', 'delivery', 'token', 'restaurante', 2500),
    rule('nature', 'delivery', 'nature', 'expense', 500)
  ]);
  assert.equal(result.categoryId, 'delivery');
  assert.equal(result.confidenceBasisPoints, 9500);
  assert.equal(result.status, 'automatic');
  assert.deepEqual(result.evidence.map(item => item.ruleId), ['merchant', 'token', 'nature']);
});

test('aplica faixas 90/70 e não decide empates', () => {
  assert.equal(classifyTransaction(candidate, [rule('alias', 'restaurants', 'alias', 'ifood restaurante', 8000)]).status, 'suggested');
  assert.equal(classifyTransaction(candidate, [rule('weak', 'restaurants', 'token', 'ifood', 6000)]).status, 'uncategorized');
  const tied = classifyTransaction(candidate, [
    rule('one', 'delivery', 'token', 'ifood', 7000),
    rule('two', 'restaurants', 'token', 'ifood', 7000)
  ]);
  assert.equal(tied.status, 'uncategorized');
  assert.equal(tied.categoryId, undefined);
});
