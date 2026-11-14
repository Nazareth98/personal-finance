import assert from 'node:assert/strict';
import test from 'node:test';
import { accountTypeFromPluggy, centsFromPluggy, ledgerSemantics, sanitizedDescription } from './pluggy-domain.ts';

test('converte valores Pluggy em centavos exatos', () => {
  assert.equal(centsFromPluggy(-42.9), -4290n);
  assert.equal(centsFromPluggy('5000.00'), 500000n);
  assert.equal(centsFromPluggy('0,01'), 1n);
  assert.throws(() => centsFromPluggy('1.234'));
});

test('mapeia contas sem antecipar a competência de cartão', () => {
  assert.equal(accountTypeFromPluggy({ id: '1', type: 'BANK', subtype: 'CHECKING_ACCOUNT' }), 'checking');
  assert.equal(accountTypeFromPluggy({ id: '2', type: 'CREDIT' }), 'credit_card');
  assert.equal(accountTypeFromPluggy({ id: '3', subtype: 'INVESTMENT' }), 'investment');
});

test('usa categoria do provedor somente para semânticas financeiras inequívocas', () => {
  assert.deepEqual(ledgerSemantics({ id: '1', accountId: 'a', amount: '-20.00', date: '2026-10-01', category: 'Transfer' }), {
    nature: 'own_transfer', reporting: 'neutral', categoryId: 'transfers', classificationStatus: 'automatic'
  });
  assert.deepEqual(ledgerSemantics({ id: '2', accountId: 'a', amount: '100.00', date: '2026-10-01' }), {
    nature: 'income', reporting: 'income', categoryId: null, classificationStatus: 'uncategorized'
  });
  assert.equal(sanitizedDescription('  COMPRA   TESTE  '), 'COMPRA TESTE');
});
