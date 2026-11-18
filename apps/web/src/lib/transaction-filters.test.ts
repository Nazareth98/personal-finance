import test from 'node:test';
import assert from 'node:assert/strict';
import type { TransactionContract } from '@personal-finance/domain';
import { matchesTransactionFilters, readTransactionFilters } from './transaction-filters.ts';

const row = (overrides: Partial<TransactionContract>): TransactionContract => ({
  id: 'id', accountId: 'a', description: 'Café da manhã', amountCents: -1000n, nature: 'expense', reporting: 'expense',
  source: 'pluggy', eventDate: '2026-11-05', competence: '2026-11', classificationStatus: 'confirmed', categoryId: 'food', ...overrides
});
const none = { q: '', account: '', category: '', nature: '' };

test('busca por descrição ignora acentos e maiúsculas', () => {
  assert.equal(matchesTransactionFilters(row({}), { ...none, q: 'CAFE' }), true);
  assert.equal(matchesTransactionFilters(row({}), { ...none, q: 'mercado' }), false);
});

test('filtros combinados exigem todas as condições', () => {
  const filters = { q: 'cafe', account: 'a', category: 'food', nature: 'expense' };
  assert.equal(matchesTransactionFilters(row({}), filters), true);
  assert.equal(matchesTransactionFilters(row({ accountId: 'b' }), filters), false);
  assert.equal(matchesTransactionFilters(row({ nature: 'own_transfer', reporting: 'neutral' }), filters), false);
});

test('categoria vazia filtra lançamentos sem categoria', () => {
  const { categoryId: _categoryId, ...uncategorized } = row({});
  assert.equal(matchesTransactionFilters(uncategorized, { ...none, category: 'none' }), true);
  assert.equal(matchesTransactionFilters(row({}), { ...none, category: 'none' }), false);
});

test('lê filtros da URL', () => {
  assert.deepEqual(readTransactionFilters(new URLSearchParams('q=cafe&account=a')), { q: 'cafe', account: 'a', category: '', nature: '' });
});
