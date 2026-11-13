import assert from 'node:assert/strict';
import test from 'node:test';
import { authErrorMessage } from './errors.ts';

test('traduz falha de credenciais sem expor detalhes técnicos', () => {
  assert.equal(authErrorMessage(new Error('Invalid login credentials')), 'E-mail ou senha inválidos.');
  assert.equal(authErrorMessage(new Error('internal database error')), 'Não foi possível concluir a solicitação. Tente novamente.');
});

test('explica bloqueio de conta não proprietária', () => {
  assert.equal(authErrorMessage(new Error('owner access required')), 'Esta conta não está autorizada a acessar o sistema.');
});
