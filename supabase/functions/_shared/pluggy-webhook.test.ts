import assert from 'node:assert/strict';
import test from 'node:test';
import { transactionWebhook, webhookItemId } from './pluggy-webhook.ts';

test('le eventos de transacao no formato direto do Pluggy', () => {
  const payload = {
    itemId: 'item-1', accountId: 'account-1',
    transactionIds: ['transaction-1', 'transaction-1', 'transaction-2']
  };
  assert.equal(webhookItemId(payload), 'item-1');
  assert.deepEqual(transactionWebhook(payload), {
    accountId: 'account-1', transactionIds: ['transaction-1', 'transaction-2']
  });
});

test('aceita envelope data e rejeita evento incompleto', () => {
  assert.deepEqual(transactionWebhook({ data: { accountId: 'account-1', transactionIds: ['transaction-1'] } }), {
    accountId: 'account-1', transactionIds: ['transaction-1']
  });
  assert.equal(transactionWebhook({ accountId: 'account-1', transactionIds: [] }), null);
  assert.equal(transactionWebhook({ accountId: 'account-1', transactionIds: Array(1001).fill('transaction-1') }), null);
});
