import assert from 'node:assert/strict';
import test from 'node:test';
import { PluggyClient } from './pluggy-client.ts';

test('usa o contrato atual de Connect Token e pagina transações por cursor', async () => {
  const originalFetch = globalThis.fetch;
  const calls: { url: string; body?: string }[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, ...(typeof init?.body === 'string' ? { body: init.body } : {}) });
    if (url.endsWith('/auth')) return Response.json({ apiKey: 'synthetic-api-key' });
    if (url.endsWith('/connect_token')) return Response.json({ accessToken: 'synthetic-connect-token' });
    if (url.includes('after=cursor-2')) return Response.json({ results: [], next: null });
    return Response.json({ results: [], next: '?accountId=account-1&after=cursor-2' });
  };

  try {
    const client = new PluggyClient('synthetic-client', 'synthetic-secret', 'https://pluggy.example.test');
    await client.createConnectToken('owner-1');
    const first = await client.getTransactions('account-1', '2026-11-01');
    await client.getTransactions('account-1', undefined, first.next);

    assert.deepEqual(JSON.parse(calls[1].body ?? ''), { options: { clientUserId: 'owner-1' } });
    assert.equal(calls[2].url, 'https://pluggy.example.test/v2/transactions?accountId=account-1&createdAtFrom=2026-11-01');
    assert.equal(calls[3].url, 'https://pluggy.example.test/v2/transactions?accountId=account-1&after=cursor-2');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('busca atualizacoes dirigidas em lotes aceitos pelo Pluggy', async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = async input => {
    const url = String(input);
    calls.push(url);
    if (url.endsWith('/auth')) return Response.json({ apiKey: 'synthetic-api-key' });
    return Response.json({ results: [], next: null });
  };

  try {
    const client = new PluggyClient('synthetic-client', 'synthetic-secret', 'https://pluggy.example.test');
    await client.getTransactionsByIds('account-1', ['transaction-1', 'transaction-2']);
    assert.equal(calls[1], 'https://pluggy.example.test/v2/transactions?accountId=account-1&ids=transaction-1%2Ctransaction-2');
    assert.throws(() => client.getTransactionsByIds('account-1', []), /pluggy_transactions_invalid_ids/);
    assert.throws(() => client.getTransactionsByIds('account-1', Array.from({ length: 501 }, (_, index) => String(index))),
      /pluggy_transactions_invalid_ids/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
