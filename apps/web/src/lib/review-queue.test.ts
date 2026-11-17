import assert from 'node:assert/strict';
import test from 'node:test';
import type { TransactionContract } from '@personal-finance/domain';
import { reviewResolution } from './review-queue.ts';

const base: TransactionContract = {
  id: 'transaction', accountId: 'account', description: 'Synthetic transaction', amountCents: -1000n,
  nature: 'expense', reporting: 'expense', source: 'pluggy', eventDate: '2026-11-17', competence: '2026-11',
  classificationStatus: 'uncategorized'
};
const empty = { semanticOverrides: [], links: [], savingsMovements: [], cardStatementEntries: [] };

test('mantém sugestão ou ausência de categoria na fila', () => {
  assert.equal(reviewResolution(base, empty).pending, true);
  assert.equal(reviewResolution({ ...base, classificationStatus: 'suggested' }, empty).pending, true);
  assert.equal(reviewResolution({ ...base, classificationStatus: 'automatic' }, empty).pending, false);
});

test('exige vínculo para naturezas patrimoniais', () => {
  const transfer = { ...base, nature: 'own_transfer', reporting: 'neutral', classificationStatus: 'confirmed' } as const;
  assert.equal(reviewResolution(transfer, empty).semanticResolved, false);
  assert.equal(reviewResolution(transfer, {
    ...empty,
    links: [{ id: 'link', sourceTransactionId: transfer.id, targetTransactionId: 'counterpart', type: 'own_transfer' }]
  }).pending, false);
});

test('move confirmação semântica para o histórico', () => {
  const payment = { ...base, nature: 'card_payment', reporting: 'neutral', classificationStatus: 'automatic' } as const;
  assert.equal(reviewResolution(payment, empty).pending, true);
  assert.equal(reviewResolution(payment, {
    ...empty,
    semanticOverrides: [{
      id: 'override', transactionId: payment.id, nature: 'card_payment', reporting: 'neutral',
      statementId: 'statement', reason: 'owner_confirmation', semanticVersion: 'semantics-v1', updatedAt: '2026-11-17T12:00:00Z'
    }]
  }).pending, false);
});
