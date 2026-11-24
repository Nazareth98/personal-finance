import assert from 'node:assert/strict';
import test from 'node:test';
import type { TransactionContract } from '@personal-finance/domain';
import { inReviewPeriod, reviewMonthStart, validReviewStartDate } from './review-period.ts';
import { pendingReviewCount } from './review-queue.ts';
import { reviewAttention } from './overview-attention.ts';

const row: TransactionContract = {
  id: 'synthetic', accountId: 'bank', description: 'Compra fictícia', amountCents: -100n,
  nature: 'expense', reporting: 'expense', source: 'pluggy', eventDate: '2026-01-15',
  competence: '2026-02', classificationStatus: 'uncategorized'
};
const period = { reviewStartDate: '2026-02-15', creditCards: [{ id: 'card', accountId: 'credit', closingDay: 5, dueDay: 12 }] };
const relations = { ...period, semanticOverrides: [], links: [], savingsMovements: [], cardStatementEntries: [] };

test('data válida, ano bissexto e limites sem normalização silenciosa', () => {
  for (const value of [null, '2024-02-29', '0001-01-01', '9999-12-31']) assert.equal(validReviewStartDate(value), true);
  for (const value of ['', '2026-02-29', '2026-04-31', '0000-01-01', '10000-01-01', '2026-2-01', 'infinity']) {
    assert.equal(validReviewStartDate(value), false, value);
  }
});

test('conta inclui o dia inicial; cartão inclui o mês da fatura mesmo com compra anterior', () => {
  assert.equal(inReviewPeriod(row, period), false);
  assert.equal(inReviewPeriod({ ...row, eventDate: '2026-02-15' }, period), true);
  assert.equal(inReviewPeriod({ ...row, eventDate: '2026-02-14' }, period), false);
  assert.equal(inReviewPeriod({ ...row, accountId: 'credit' }, period), true);
  assert.equal(inReviewPeriod({ ...row, accountId: 'credit', competence: '2026-01' }, period), false);
  assert.equal(inReviewPeriod(row, { reviewStartDate: null }), true);
});

test('atalhos incluem o mês atual e atravessam o ano sem depender do dia', () => {
  assert.equal(reviewMonthStart(1, new Date(2026, 0, 31)), '2026-01-01');
  assert.equal(reviewMonthStart(3, new Date(2026, 0, 31)), '2025-11-01');
  assert.equal(reviewMonthStart(6, new Date(2026, 0, 31)), '2025-08-01');
});

test('fila, navegação e visão geral concordam; ampliar período preserva confirmações e livro', () => {
  const rows = [row, { ...row, id: 'card', accountId: 'credit' },
    { ...row, id: 'confirmed', classificationStatus: 'confirmed' as const },
    { ...row, id: 'future', eventDate: '2026-03-01' }];
  const before = structuredClone(rows);
  assert.equal(pendingReviewCount(rows, relations), 2);
  assert.equal(reviewAttention(rows, relations).total, 2);
  assert.equal(pendingReviewCount(rows, { ...relations, reviewStartDate: null }), 3);
  assert.deepEqual(rows, before);
});
