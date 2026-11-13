import { expect, test, type Page, type Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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

async function mockSupabase(page: Page, owner = true, rpcCalls: { path: string; body: string | null }[] = []) {
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
    if (url.pathname === '/rest/v1/financial_accounts') {
      if (route.request().method() === 'POST') {
        rpcCalls.push({ path: url.pathname, body: route.request().postData() });
        await route.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
        { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Conta principal', account_type: 'checking', opening_balance_cents: '100000' },
        { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', name: 'Reserva', account_type: 'savings', opening_balance_cents: '0' }
      ]) });
      return;
    }
    if (url.pathname === '/rest/v1/categories') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'salary', name: 'Salário' }, { id: 'groceries', name: 'Supermercado' }]) });
      return;
    }
    if (url.pathname === '/rest/v1/transactions') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
        { id: '11111111-2222-4111-8111-111111111111', account_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', category_id: 'salary', description: 'Receita mensal', amount_cents: '500000', nature: 'income', reporting: 'income', source: 'manual', event_date: '2026-11-05', competence: '2026-11', classification_status: 'confirmed', external_key: null },
        { id: '22222222-2222-4222-8222-222222222222', account_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', category_id: 'groceries', description: 'Mercado', amount_cents: '-10000', nature: 'expense', reporting: 'expense', source: 'manual', event_date: '2026-11-06', competence: '2026-11', classification_status: 'confirmed', external_key: null },
        { id: '33333333-2222-4333-8333-333333333333', account_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', category_id: 'transfers', description: 'Reserva mensal', amount_cents: '-50000', nature: 'own_transfer', reporting: 'neutral', source: 'manual', event_date: '2026-11-07', competence: '2026-11', classification_status: 'confirmed', external_key: null },
        { id: '44444444-2222-4444-8444-444444444444', account_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', category_id: 'transfers', description: 'Reserva mensal', amount_cents: '50000', nature: 'own_transfer', reporting: 'neutral', source: 'manual', event_date: '2026-11-07', competence: '2026-11', classification_status: 'confirmed', external_key: null },
        { id: '88888888-2222-4888-8888-888888888888', account_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', category_id: 'savings', description: 'Aplicação importada', amount_cents: '-25000', nature: 'own_transfer', reporting: 'neutral', source: 'pluggy', event_date: '2026-11-08', competence: '2026-11', classification_status: 'confirmed', external_key: 'pluggy-savings-1' }
      ]) });
      return;
    }
    if (url.pathname === '/rest/v1/transaction_links') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: '55555555-2222-4555-8555-555555555555', source_transaction_id: '33333333-2222-4333-8333-333333333333', target_transaction_id: '44444444-2222-4444-8444-444444444444', link_type: 'own_transfer' }]) });
      return;
    }
    if (url.pathname === '/rest/v1/category_budgets') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
        { id: '77777777-2222-4777-8777-777777777777', category_id: 'groceries', percentage_basis_points: 1000 }
      ]) });
      return;
    }
    if (url.pathname === '/rest/v1/savings_boxes') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
        { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', name: 'Reserva de emergência', opening_balance_cents: '100000', target_cents: '1000000', target_date: '2027-12-31' }
      ]) });
      return;
    }
    if (url.pathname === '/rest/v1/savings_movements') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      return;
    }
    if (url.pathname.startsWith('/rest/v1/rpc/')) {
      rpcCalls.push({ path: url.pathname, body: route.request().postData() });
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify('66666666-2222-4666-8666-666666666666') });
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

async function login(page: Page) {
  await page.goto('/#overview');
  await page.getByLabel('E-mail').fill('owner@example.test');
  await page.getByLabel('Senha').fill('uma-senha-local-segura');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible();
}

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

test('deriva o resumo do livro sem contar a transferência como receita ou despesa', async ({ page }) => {
  await mockSupabase(page);
  await login(page);
  const indicators = page.getByLabel('Indicadores do livro financeiro');
  await expect(indicators.getByText('R$ 5.000,00')).toBeVisible();
  await expect(indicators.getByText('R$ 100,00')).toBeVisible();
  await expect(indicators.getByText('R$ 4.900,00')).toBeVisible();
  await page.getByRole('link', { name: /Transações/ }).click();
  await expect(page.getByRole('table', { name: 'Livro financeiro' })).toBeVisible();
  await page.getByLabel('Período', { exact: true }).selectOption('2026');
  await expect(page.getByText('Mercado', { exact: true })).toBeVisible();
});

test('registra transferência manual nas duas pontas pelo procedimento atômico', async ({ page }) => {
  const rpcCalls: { path: string; body: string | null }[] = [];
  await mockSupabase(page, true, rpcCalls);
  await login(page);
  await page.getByRole('button', { name: 'Nova movimentação' }).click();
  await page.getByLabel('Descrição').fill('Transferência para reserva');
  await page.getByLabel('Valor (R$)').fill('250,00');
  await page.getByLabel('Tipo').selectOption('transfer');
  await page.getByLabel('Conta de origem').selectOption('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  await page.getByLabel('Conta de destino').selectOption('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  await page.getByRole('button', { name: 'Salvar movimentação' }).click();
  await expect(page.getByText('Transferência conciliada nas duas contas.')).toBeVisible();
  expect(rpcCalls).toHaveLength(1);
  expect(rpcCalls[0].path).toContain('create_manual_transfer');
  expect(rpcCalls[0].body).toContain('25000');
});

test('cadastra conta e envia ajuste vinculado ao lançamento original', async ({ page }) => {
  const writes: { path: string; body: string | null }[] = [];
  await mockSupabase(page, true, writes);
  await login(page);
  await page.getByRole('link', { name: /Contas/ }).click();
  await page.getByRole('button', { name: 'Nova conta' }).click();
  await page.getByLabel('Nome da conta').fill('Conta de testes');
  await page.getByLabel('Saldo inicial (R$)').fill('1.000,00');
  await page.getByRole('button', { name: 'Cadastrar conta' }).click();
  await expect(page.getByText('Conta cadastrada.')).toBeVisible();

  await page.getByRole('button', { name: 'Nova movimentação' }).click();
  const transactionDialog = page.getByRole('dialog', { name: 'Nova movimentação' });
  await transactionDialog.getByLabel('Descrição').fill('Correção de tarifa');
  await transactionDialog.getByLabel('Valor (R$)').fill('12,50');
  await transactionDialog.getByLabel('Tipo').selectOption('adjustment_expense');
  await transactionDialog.getByLabel('Conta').selectOption('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  await transactionDialog.getByLabel('Categoria').selectOption('groceries');
  await transactionDialog.getByLabel('Lançamento original').selectOption('22222222-2222-4222-8222-222222222222');
  await transactionDialog.getByRole('button', { name: 'Salvar movimentação' }).click();
  await expect(page.getByText('Ajuste vinculado ao lançamento original.')).toBeVisible();
  expect(writes.map(write => write.path)).toEqual(['/rest/v1/financial_accounts', '/rest/v1/rpc/create_manual_transaction']);
  expect(writes[1].body).toContain('22222222-2222-4222-8222-222222222222');
  expect(writes[1].body).toContain('-1250');
});

test('calcula e atualiza meta percentual por categoria', async ({ page }) => {
  const writes: { path: string; body: string | null }[] = [];
  await mockSupabase(page, true, writes);
  await login(page);
  await page.getByRole('link', { name: /Orçamentos/ }).click();

  await expect(page.getByLabel('Resumo das metas por categoria').getByText('R$ 5.000,00')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Supermercado' })).toBeVisible();
  await expect(page.getByText('R$ 100,00 utilizados de R$ 500,00')).toBeVisible();
  await page.getByRole('button', { name: 'Definir meta' }).click();
  const dialog = page.getByRole('dialog', { name: 'Definir meta' });
  await dialog.getByLabel('Categoria').selectOption('groceries');
  await dialog.getByLabel('Percentual da receita').fill('12,50');
  await dialog.getByRole('button', { name: 'Salvar meta' }).click();

  await expect(page.getByText('Meta por categoria salva.')).toBeVisible();
  expect(writes).toHaveLength(1);
  expect(writes[0].path).toContain('set_category_budget');
  expect(writes[0].body).toContain('1250');
});

test('cadastra caixinha, registra aporte neutro e associa lançamento importado', async ({ page }) => {
  const writes: { path: string; body: string | null }[] = [];
  await mockSupabase(page, true, writes);
  await login(page);
  await page.getByRole('link', { name: /Caixinhas/ }).click();

  await expect(page.getByText('R$ 1.000,00 de R$ 10.000,00')).toBeVisible();
  await page.getByRole('button', { name: 'Nova caixinha' }).click();
  const boxDialog = page.getByRole('dialog', { name: 'Nova caixinha' });
  await boxDialog.getByLabel('Nome da caixinha').fill('Viagem');
  await boxDialog.getByLabel('Saldo inicial (R$)').fill('100,00');
  await boxDialog.getByLabel('Meta (R$)').fill('2.000,00');
  await boxDialog.getByRole('button', { name: 'Cadastrar caixinha' }).click();
  await expect(page.getByText('Caixinha cadastrada.')).toBeVisible();

  await page.getByRole('button', { name: 'Registrar movimento' }).click();
  const movementDialog = page.getByRole('dialog', { name: 'Registrar movimento' });
  await movementDialog.getByLabel('Conta').selectOption('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  await movementDialog.getByLabel('Descrição').fill('Aporte mensal');
  await movementDialog.getByLabel('Valor (R$)').fill('250,00');
  await movementDialog.getByRole('button', { name: 'Salvar movimento' }).click();
  await expect(page.getByText('Movimento da caixinha registrado.')).toBeVisible();

  await page.getByRole('button', { name: 'Associar importado' }).click();
  const linkDialog = page.getByRole('dialog', { name: 'Associar lançamento importado' });
  await linkDialog.getByLabel('Lançamento importado').selectOption('88888888-2222-4888-8888-888888888888');
  await linkDialog.getByRole('button', { name: 'Salvar movimento' }).click();
  await expect(page.getByText('Lançamento associado à caixinha.')).toBeVisible();

  expect(writes.map(write => write.path)).toEqual([
    '/rest/v1/rpc/create_savings_box',
    '/rest/v1/rpc/create_savings_movement',
    '/rest/v1/rpc/link_savings_movement'
  ]);
  expect(writes[1].body).toContain('25000');
  expect(writes[2].body).toContain('88888888-2222-4888-8888-888888888888');
});

test('mantém as telas reais do livro sem violações WCAG A/AA detectáveis', async ({ page }) => {
  await mockSupabase(page);
  await login(page);
  for (const destination of ['overview', 'transactions', 'accounts', 'budgets', 'savings']) {
    await page.goto(`/#${destination}`);
    await expect(page.getByRole('main')).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(results.violations).toEqual([]);
  }
});
