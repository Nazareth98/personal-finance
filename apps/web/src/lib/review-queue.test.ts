import assert from 'node:assert/strict';
import test from 'node:test';
import type { TransactionContract } from '@personal-finance/domain';
import { pendingReviewCount, reviewReason, reviewResolution, suggestedCategoryId } from './review-queue.ts';

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

test('conta pendências somente entre importados revisáveis', () => {
  const rows = [
    { ...base, id: 'p', classificationStatus: 'suggested' as const },
    { ...base, id: 'm', source: 'manual' as const, classificationStatus: 'uncategorized' as const },
    { ...base, id: 'ok', classificationStatus: 'confirmed' as const }
  ];
  assert.equal(pendingReviewCount(rows, empty), 1);
});

test('motivo põe vínculo antes de categoria e sugestão só existe quando sugerida', () => {
  assert.equal(reviewReason({ semanticResolved: false, categoryResolved: false, pending: true }), 'links');
  assert.equal(reviewReason({ semanticResolved: true, categoryResolved: false, pending: true }), 'categories');
  assert.equal(suggestedCategoryId({ ...base, classificationStatus: 'suggested', categoryId: 'row' }, 'model'), 'model');
  assert.equal(suggestedCategoryId({ ...base, classificationStatus: 'suggested', categoryId: 'row' }), 'row');
  assert.equal(suggestedCategoryId({ ...base, classificationStatus: 'uncategorized', categoryId: 'row' }, 'model'), undefined);
});
