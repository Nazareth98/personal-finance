import assert from 'node:assert/strict';
import test from 'node:test';
import { accountTypeFromPluggy, cardLedgerSemantics, centsFromPluggy, institutionFromAccountName, ledgerSemantics, sanitizedDescription, isStatementCarryover } from './pluggy-domain.ts';

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

test('normaliza compras, estornos e pagamentos de cartão para o domínio', () => {
  assert.deepEqual(cardLedgerSemantics({ id: '1', accountId: 'card', amount: '123.45', date: '2026-11-01', type: 'DEBIT' }), {
    amountCents: -12345n, nature: 'expense', reporting: 'expense'
  });
  assert.deepEqual(cardLedgerSemantics({ id: '2', accountId: 'card', amount: '-23.45', date: '2026-11-02', type: 'CREDIT', operationType: 'ESTORNO' }), {
    amountCents: 2345n, nature: 'refund', reporting: 'expense'
  });
});

test('pagamento visto pelo cartão é espelho neutro, não estorno nem pagamento (D-053)', () => {
  const credit = { id: 'p', accountId: 'card', amount: '-100.00', date: '2026-11-03', type: 'CREDIT' } as PluggyTransaction;
  const mirror = { amountCents: 10000n, nature: 'adjustment', reporting: 'neutral' };
  assert.deepEqual(cardLedgerSemantics({ ...credit, operationType: 'PAGAMENTO_FATURA' }), mirror);
  assert.deepEqual(cardLedgerSemantics({ ...credit, description: 'PGTO BOLETO CAIXA' }), mirror);
  assert.deepEqual(cardLedgerSemantics({ ...credit, description: 'PAGAMENTO COM SALDO' }), mirror);
  assert.deepEqual(cardLedgerSemantics({ ...credit, description: 'Pagamento recebido' }), mirror);
  assert.equal(cardLedgerSemantics({ ...credit, description: 'PAG*LOJA EXEMPLO' }).nature, 'refund');
  assert.equal(cardLedgerSemantics({ ...credit, description: 'ESTORNO PAGAMENTO LOJA' }).nature, 'refund');
});

test('linha informativa da fatura anterior fica neutra e fora da fatura (D-050)', () => {
  const carryover = { id: 'c', description: 'TOTAL DA FATURA ANTERIOR', amount: 2827, date: '2026-09-07', type: 'DEBIT' } as PluggyTransaction;
  assert.equal(isStatementCarryover(carryover), true);
  assert.deepEqual(cardLedgerSemantics(carryover), { amountCents: -282700n, nature: 'adjustment', reporting: 'neutral' });
  assert.equal(isStatementCarryover({ ...carryover, description: 'Saldo anterior da fatura' }), true);
  assert.equal(isStatementCarryover({ ...carryover, description: 'MERCADO TOTAL' }), false);
  assert.equal(cardLedgerSemantics({ ...carryover, description: 'MERCADO TOTAL' }).nature, 'expense');
});


test('banco da conta do MeuPluggy sai do nome da conta, sem chute quando ambíguo (D-056)', () => {
  const connectors = [
    { id: 601, name: 'Itaú', isOpenFinance: true }, { id: 201, name: 'Itaú' }, { id: 219, name: 'Caixa Econômica Federal' },
    { id: 212, name: 'Nubank' }, { id: 1, name: 'Banco do Brasil' }, { id: 2, name: 'Banco Inter' }
  ];
  assert.equal(institutionFromAccountName('LATAM PASS ITAU VISA GOLD', connectors)?.id, 201);
  assert.equal(institutionFromAccountName('itau', connectors)?.id, 201);
  assert.equal(institutionFromAccountName('CAIXA SIM VISA INTERN CREDITO', connectors)?.id, 219);
  assert.equal(institutionFromAccountName('Banco conta corrente', connectors), undefined);
  assert.equal(institutionFromAccountName('NUBANK ITAU', connectors), undefined);
});
