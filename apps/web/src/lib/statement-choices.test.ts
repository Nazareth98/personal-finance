import test from 'node:test';
import assert from 'node:assert/strict';
import type { CardStatement, CardStatementEntry, CreditCard, TransactionContract } from '@personal-finance/domain';
import { statementChoices } from './statement-choices.ts';

const card: CreditCard = { id: 'card', accountId: 'cc', closingDay: 8, dueDay: 15 } as CreditCard;
const tx = (id: string, amountCents: bigint, eventDate: string): TransactionContract => ({ id, accountId: 'cc', description: id, amountCents,
  nature: amountCents < 0n ? 'expense' : 'refund', reporting: 'expense', source: 'pluggy', eventDate, competence: eventDate.slice(0, 7), classificationStatus: 'confirmed' } as TransactionContract);
const statements: CardStatement[] = [
  { id: 'sep', cardId: 'card', competence: '2026-09', closingDate: '2026-09-08', dueDate: '2026-09-15' },
  { id: 'oct', cardId: 'card', competence: '2026-10', closingDate: '2026-10-08', dueDate: '2026-10-15' },
  { id: 'nov', cardId: 'card', competence: '2026-11', closingDate: '2026-11-08', dueDate: '2026-11-15' }
];
const transactions = [tx('a', -100000n, '2026-08-20'), tx('b', -282700n, '2026-09-20'), tx('c', -5000n, '2026-10-20'), tx('paid', -100000n, '2026-09-14')];
const entries: CardStatementEntry[] = [
  { id: 'e1', statementId: 'sep', transactionId: 'a', type: 'purchase' },
  { id: 'e2', statementId: 'sep', transactionId: 'paid', type: 'payment' },
  { id: 'e3', statementId: 'oct', transactionId: 'b', type: 'purchase' },
  { id: 'e4', statementId: 'nov', transactionId: 'c', type: 'purchase' }
];

test('sugere a fatura do vencimento com o mesmo valor e mostra período de compras (D-051)', () => {
  const choices = statementChoices({ payment: { id: 'pay', amountCents: -282700n, eventDate: '2026-10-15' }, statements, entries, cards: [card], transactions });
  assert.deepEqual(choices.map(choice => [choice.statementId, choice.suggested, choice.status]), [['oct', true, 'open'], ['nov', false, 'open'], ['sep', false, 'paid']]);
  const october = choices[0]!;
  assert.equal(october.periodStart, '2026-09-09');
  assert.equal(october.closingDate, '2026-10-08');
  assert.equal(october.openCents, 282700n);
  assert.equal(october.openAfterCents, 0n);
});

test('pagamento já vinculado não conta como pago na própria fatura', () => {
  const choices = statementChoices({ payment: { id: 'paid', amountCents: -100000n, eventDate: '2026-09-14' }, statements, entries, cards: [card], transactions });
  const september = choices.find(choice => choice.statementId === 'sep')!;
  assert.equal(september.status, 'open');
  assert.equal(september.suggested, true);
});
