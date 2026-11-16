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

test('PIX ou transferência genérica segue o sinal e nunca presume conta própria', () => {
  assert.deepEqual(ledgerSemantics({ id: '1', accountId: 'a', amount: '-20.00', date: '2026-10-01', category: 'Transfer' }), {
    nature: 'expense', reporting: 'expense', categoryId: null, classificationStatus: 'uncategorized'
  });
  assert.deepEqual(ledgerSemantics({ id: '2', accountId: 'a', amount: '100.00', date: '2026-10-01', category: 'PIX' }), {
    nature: 'income', reporting: 'income', categoryId: null, classificationStatus: 'uncategorized'
  });
});

test('reconhece somente pagamentos e movimentos de reserva com evidência explícita', () => {
  assert.deepEqual(ledgerSemantics({ id: '1', accountId: 'a', amount: '-250.00', date: '2026-10-01', category: 'Credit card payment' }), {
    nature: 'card_payment', reporting: 'neutral', categoryId: null, classificationStatus: 'automatic'
  });
  assert.deepEqual(ledgerSemantics({ id: '2', accountId: 'a', amount: '100.00', date: '2026-10-01', description: 'Entrada RESGATE COFRINHOS' }), {
    nature: 'savings_withdrawal', reporting: 'neutral', categoryId: 'savings', classificationStatus: 'automatic'
  });
  assert.deepEqual(ledgerSemantics({ id: '3', accountId: 'a', amount: '-100.00', date: '2026-10-01', description: 'Aplicação na caixinha' }), {
    nature: 'savings_contribution', reporting: 'neutral', categoryId: 'savings', classificationStatus: 'automatic'
  });
  assert.equal(ledgerSemantics({ id: '4', accountId: 'a', amount: '-100.00', date: '2026-10-01', description: 'Aporte reserva' }).nature, 'savings_contribution');
  assert.equal(ledgerSemantics({ id: '5', accountId: 'a', amount: '-100.00', date: '2026-10-01', description: 'Resgate cofrinhos' }).nature, 'expense');
});

test('normaliza descrições sem persistir ruído de espaços', () => {
  assert.equal(sanitizedDescription('  COMPRA   TESTE  '), 'COMPRA TESTE');
});
