import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBrlCents, validateTransactionDraft, type TransactionDraft } from './transaction-validation.ts';

test('converte dinheiro pt-BR em bigint sem perder centavos', () => {
  assert.equal(parseBrlCents('1.234,56'), 123456n);
  assert.equal(parseBrlCents('0,01'), 1n);
  assert.equal(parseBrlCents('10'), 1000n);
  assert.equal(parseBrlCents('12,5'), 1250n);
});
test('rejeita formatos ambíguos e valores incorretos', () => {
  assert.equal(parseBrlCents('1,234'), null);
  assert.equal(parseBrlCents('-10,00'), null);
  assert.equal(parseBrlCents('1.23,00'), null);
  assert.equal(parseBrlCents(''), null);
});
const valid: TransactionDraft = { description:'Compra sintética', amount:'123,45',kind:'expense',account:'checking',confirmedDemo:true };
test('valida formulário completo e rejeita consentimento ausente', () => {
  assert.deepEqual(validateTransactionDraft(valid), {});
  assert.match(validateTransactionDraft({...valid, confirmedDemo:false}).confirmedDemo ?? '', /Confirme/);
});
test('transferência não é recusada nem categorizada como despesa', () => {
  assert.deepEqual(validateTransactionDraft({...valid,kind:'transfer'}), {});
});
test('identifica entrada malformada em vários campos', () => {
  const errors = validateTransactionDraft({...valid,description:'a',amount:'0',account:'invalid'});
  assert.ok(errors.description && errors.amount && errors.account);
});
