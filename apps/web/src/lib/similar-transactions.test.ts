import assert from 'node:assert/strict';
import test from 'node:test';
import type { TransactionContract } from '@personal-finance/domain';
import { similarTransactions } from './similar-transactions.ts';

const base: TransactionContract = {
  id: 'a', accountId: 'account', description: 'UBER *TRIP 1234', amountCents: -2390n,
  nature: 'expense', reporting: 'expense', source: 'pluggy', eventDate: '2026-11-18', competence: '2026-11',
  classificationStatus: 'automatic', categoryId: 'restaurants'
};

test('iguais seguem o alias do banco e separam os confirmados pelo dono (D-060)', () => {
  const rows: TransactionContract[] = [
    base,
    { ...base, id: 'b', description: 'Uber *Trip 9876', eventDate: '2026-11-12', accountId: 'other' },
    { ...base, id: 'c', eventDate: '2026-10-28', classificationStatus: 'confirmed', categoryId: 'leisure' },
    { ...base, id: 'd', eventDate: '2026-10-09', classificationStatus: 'confirmed', categoryId: 'ride_hailing' },
    { ...base, id: 'e', description: 'UBER EATS' },
    { ...base, id: 'f', source: 'manual' },
    { ...base, id: 'g', nature: 'own_transfer', reporting: 'neutral' }
  ];
  const result = similarTransactions(base, rows, 'ride_hailing');
  assert.deepEqual(result.unconfirmed.map(row => row.id), ['b']);
  assert.deepEqual(result.confirmed.map(row => row.id), ['c']);
  assert.deepEqual(similarTransactions({ ...base, description: '1234' }, rows, 'ride_hailing'), { unconfirmed: [], confirmed: [] });
});
