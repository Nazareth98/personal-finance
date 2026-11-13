import test from 'node:test';
import assert from 'node:assert/strict';
import { readTokens, validateTokens, contrastRatio } from '../scripts/validate.mjs';

test('tokens Light e Dark seguem contrato e contraste mínimo', async () => {
  const tokens = await readTokens();
  assert.deepEqual(validateTokens(tokens), []);
});

test('contraste é calculado segundo luminância relativa', () => {
  assert.ok(Math.abs(contrastRatio('#000000', '#FFFFFF') - 21) < 0.001);
  assert.ok(contrastRatio('#FFFFFF', '#FFFFFF') === 1);
});

test('tokens com divergência entre temas são rejeitados', async () => {
  const tokens = await readTokens();
  delete tokens.semantic.dark['bg-canvas'];
  assert.match(validateTokens(tokens).join(' '), /mesmas chaves/);
});

test('cores ilegíveis em botões são rejeitadas', async () => {
  const tokens = await readTokens();
  tokens.semantic.dark['action-primary'] = '#EFF6FF';
  assert.match(validateTokens(tokens).join(' '), /Contraste insuficiente/);
});
