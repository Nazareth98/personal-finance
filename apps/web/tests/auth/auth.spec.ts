import { expect, test, type Page, type Route } from '@playwright/test';

const userId = '11111111-1111-4111-8111-111111111111';

function token() {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: userId, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.signature`;
}

function session(email: string) {
  const now = new Date().toISOString();
  return {
    access_token: token(),
    refresh_token: 'fixture-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: {
      id: userId,
      aud: 'authenticated',
      role: 'authenticated',
      email,
      email_confirmed_at: now,
      confirmed_at: now,
      last_sign_in_at: now,
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: {},
      identities: [],
      created_at: now,
      updated_at: now,
      is_anonymous: false
    }
  };
}

async function mockSupabase(page: Page, owner = true) {
  await page.route('http://127.0.0.1:54321/**', async (route: Route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/auth/v1/token') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(session('owner@example.test')) });
      return;
    }
    if (url.pathname === '/auth/v1/recover') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      return;
    }
    if (url.pathname === '/auth/v1/logout') {
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    if (url.pathname === '/rest/v1/profiles') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(owner ? [{ id: userId }] : []) });
      return;
    }
    await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  });
}

test('protege a aplicação, autentica o proprietário e encerra a sessão', async ({ page }) => {
  await mockSupabase(page);
  await page.goto('/#overview');

  await expect(page.getByRole('heading', { name: 'Acesse suas finanças' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toHaveCount(0);

  await page.getByLabel('E-mail').fill('owner@example.test');
  await page.getByLabel('Senha').fill('uma-senha-local-segura');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible();
  await expect(page.getByText('owner@example.test')).toBeVisible();
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page.getByRole('heading', { name: 'Acesse suas finanças' })).toBeVisible();
});

test('recuperação usa resposta neutra para não enumerar usuários', async ({ page }) => {
  await mockSupabase(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Esqueci minha senha' }).click();
  await page.getByLabel('E-mail').fill('owner@example.test');
  await page.getByRole('button', { name: 'Enviar instruções' }).click();
  await expect(page.getByText('Se o e-mail estiver autorizado, você receberá as instruções de recuperação.')).toBeVisible();
});

test('nega sessão autenticada sem perfil proprietário', async ({ page }) => {
  await mockSupabase(page, false);
  await page.goto('/');
  await page.getByLabel('E-mail').fill('other@example.test');
  await page.getByLabel('Senha').fill('uma-senha-local-segura');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('alert')).toContainText('não está autorizada');
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toHaveCount(0);
});
