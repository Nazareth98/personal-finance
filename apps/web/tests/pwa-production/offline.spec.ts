import { expect, test } from '@playwright/test';

test('ativa o service worker e usa página offline sem cache financeiro', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Configuração necessária' })).toBeVisible();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  const cacheEntries = await page.evaluate(async () => {
    const names = await caches.keys();
    const entries = await Promise.all(names.map(async name => (await caches.open(name)).keys()));
    return entries.flat().map(request => new URL(request.url).pathname);
  });
  expect(cacheEntries).toContain('/offline.html');
  expect(cacheEntries.some(path => path.startsWith('/rest/v1/') || path.startsWith('/auth/v1/') || path.startsWith('/functions/v1/'))).toBe(false);

  await context.setOffline(true);
  await page.goto('/sem-conexao');
  await expect(page.getByRole('heading', { name: 'Você está sem conexão' })).toBeVisible();
  const privateRequest = await page.evaluate(async () => {
    try { await fetch('/rest/v1/transactions', { headers: { authorization: 'Bearer synthetic-test-token' } }); return 'resolved'; }
    catch { return 'rejected'; }
  });
  expect(privateRequest).toBe('rejected');
});
