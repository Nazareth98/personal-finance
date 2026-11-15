import { expect, test } from '@playwright/test';

test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-light', 'Contrato PWA verificado uma vez no Chromium.');
});

test('manifesto e service worker expõem somente o shell estático', async ({ request }) => {
  const manifest = await request.get('/manifest.webmanifest');
  expect(manifest.ok()).toBe(true);
  expect(await manifest.json()).toMatchObject({ display: 'standalone', start_url: '/#overview' });
  const worker = await request.get('/sw.js');
  expect(await worker.text()).toContain("request.headers.has('authorization')");
});

test('oferece instalação somente após o evento do navegador', async ({ page }) => {
  await page.goto('/#overview');
  await expect(page.getByRole('button', { name: 'Instalar app' })).toHaveCount(0);
  await page.evaluate(() => {
    const event = Object.assign(new Event('beforeinstallprompt'), {
      prompt: async () => { (window as typeof window & { installPromptCalled?: boolean }).installPromptCalled = true; },
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' })
    });
    window.dispatchEvent(event);
  });
  await page.getByRole('button', { name: 'Instalar app' }).click();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { installPromptCalled?: boolean }).installPromptCalled)).toBe(true);
});

test('mantém o shell sem overflow em 320 px e anuncia perda de conexão', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/#reports');
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await expect(page.getByRole('status')).toContainText('dados financeiros não são armazenados offline');
  const dimensions = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
});
