import assert from 'node:assert/strict';
import test from 'node:test';
import { billCompetences, cardCompetence, cardStatementDates, cardStatementSummary, projectInstallments, type CardStatement, type TransactionContract } from '../src/index.ts';

test('atribui compra à fatura pelo fechamento e vencimento sem conversão de fuso', () => {
  assert.equal(cardCompetence('2026-11-20', { closingDay: 28, dueDay: 5 }), '2026-12');
  assert.equal(cardCompetence('2026-11-29', { closingDay: 28, dueDay: 5 }), '2027-01');
  assert.equal(cardCompetence('2026-11-10', { closingDay: 20, dueDay: 27 }), '2026-11');
  assert.deepEqual(cardStatementDates('2026-02', { closingDay: 31, dueDay: 5 }), { closingDate: '2026-01-31', dueDate: '2026-02-05' });
});

test('projeta somente parcelas ainda devidas em competências futuras', () => {
  assert.deepEqual(projectInstallments('2026-12', 2, 4, 2500n), [
    { number: 2, dueCompetence: '2026-12', amountCents: 2500n, status: 'posted' },
    { number: 3, dueCompetence: '2027-01', amountCents: 2500n, status: 'projected' },
    { number: 4, dueCompetence: '2027-02', amountCents: 2500n, status: 'projected' }
  ]);
});

test('pagamento não vira despesa e estorno reduz o aberto da fatura', () => {
  const statement: CardStatement = { id: 'statement', cardId: 'card', competence: '2026-12', closingDate: '2026-11-28', dueDate: '2026-12-05' };
  const base = { accountId: 'card-account', categoryId: 'leisure', source: 'pluggy' as const, eventDate: '2026-11-10', competence: '2026-12', classificationStatus: 'confirmed' as const };
  const transactions: TransactionContract[] = [
    { ...base, id: 'purchase', description: 'Compra sintética', amountCents: -10000n, nature: 'expense', reporting: 'expense' },
    { ...base, id: 'refund', description: 'Estorno sintético', amountCents: 2000n, nature: 'refund', reporting: 'expense' },
    { ...base, id: 'payment', description: 'Pagamento sintético', amountCents: -3000n, nature: 'card_payment', reporting: 'neutral' }
  ];
  const summary = cardStatementSummary(statement, [
    { id: '1', statementId: 'statement', transactionId: 'purchase', type: 'purchase' },
    { id: '2', statementId: 'statement', transactionId: 'refund', type: 'refund' },
    { id: '3', statementId: 'statement', transactionId: 'payment', type: 'payment' }
  ], transactions);
  assert.deepEqual(summary, { purchasesCents: 10000n, refundsCents: 2000n, paymentsCents: 3000n, openCents: 5000n, status: 'partial', settledManually: false });
});

test('compra fica na fatura informada pelo banco, não na da data original da parcela (D-054)', () => {
  const byBill = billCompetences([
    { billId: 'b1', competence: '2026-04' }, // parcela com a data da compra original
    { billId: 'b1', competence: '2026-09' },
    { billId: 'b2', competence: '2026-10' },
    { competence: '2026-05' }
  ]);
  assert.deepEqual([...byBill], [['b1', '2026-09'], ['b2', '2026-10']]);
});

test('D-076: fatura marcada como paga fica paga sem pagamento no app', async () => {
  const { cardStatementSummary } = await import('../src/cards.ts');
  const statement = { id: 's', cardId: 'c', competence: '2026-03', closingDate: '2026-03-07', dueDate: '2026-03-15' };
  const entries = [{ id: 'e', statementId: 's', transactionId: 't', type: 'purchase' as const }];
  const transactions = [{ id: 't', accountId: 'a', description: 'Compra', amountCents: -1000n, nature: 'expense', reporting: 'expense', source: 'pluggy', eventDate: '2026-03-01', competence: '2026-03', classificationStatus: 'confirmed' }] as never;
  assert.equal(cardStatementSummary(statement, entries, transactions).status, 'open');
  const settled = cardStatementSummary({ ...statement, settledAt: '2026-11-22T12:00:00Z' }, entries, transactions);
  assert.equal(settled.status, 'paid');
  assert.equal(settled.openCents, 0n);
  assert.equal(settled.settledManually, true);
});
