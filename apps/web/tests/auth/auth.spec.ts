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

async function mockSupabase(page: Page, owner = true, rpcCalls: { path: string; body: string | null }[] = [], extraTransactions: object[] = []) {
  // Os dados de teste são de nov/2026 e as telas abrem no mês corrente: o relógio fica fixo.
  await page.clock.setFixedTime(new Date('2026-11-18T12:00:00-03:00'));
  const confirmedCategories = new Map<string, string>();
  const semanticOverrides = new Map<string, Record<string, unknown>>();
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
        { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', name: 'Reserva', account_type: 'savings', opening_balance_cents: '0' },
        { id: 'cccccccc-1111-4ccc-8ccc-cccccccccccc', name: 'Cartão principal', account_type: 'credit_card', opening_balance_cents: '0' }
      ]) });
      return;
    }
    if (url.pathname === '/rest/v1/categories') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
        { id: 'salary', name: 'Salário', category_type: 'system', applicability: 'income', icon_key: 'briefcase', color_key: 'chart-category-2', sort_order: 10, archived_at: null },
        { id: 'groceries', name: 'Supermercado', category_type: 'system', applicability: 'expense', icon_key: 'shopping-cart', color_key: 'chart-category-2', sort_order: 20, archived_at: null },
        { id: 'restaurants', name: 'Restaurantes', category_type: 'system', applicability: 'expense', icon_key: 'utensils', color_key: 'chart-category-3', sort_order: 30, archived_at: null },
        { id: 'custom_hobbies', name: 'Hobbies', category_type: 'custom', applicability: 'expense', icon_key: 'gamepad', color_key: 'chart-category-3', sort_order: 40, archived_at: null }
      ]) });
      return;
    }
    if (url.pathname === '/rest/v1/transactions') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
        { id: '11111111-2222-4111-8111-111111111111', account_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', category_id: 'salary', description: 'Receita mensal', amount_cents: '500000', nature: 'income', reporting: 'income', source: 'manual', event_date: '2026-11-05', competence: '2026-11', classification_status: 'confirmed', external_key: null },
        { id: '22222222-2222-4222-8222-222222222222', account_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', category_id: 'groceries', description: 'Mercado', amount_cents: '-10000', nature: 'expense', reporting: 'expense', source: 'manual', event_date: '2026-11-06', competence: '2026-11', classification_status: 'confirmed', external_key: null },
        { id: '99999999-3333-4999-8999-999999999999', account_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', category_id: null, description: 'Café sintético', amount_cents: '-1000', nature: 'expense', reporting: 'expense', source: 'pluggy', event_date: '2026-11-06', competence: '2026-11', classification_status: 'uncategorized', external_key: 'pluggy-transaction-9' },
        { id: '33333333-2222-4333-8333-333333333333', account_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', category_id: 'transfers', description: 'Reserva mensal', amount_cents: '-50000', nature: 'own_transfer', reporting: 'neutral', source: 'manual', event_date: '2026-11-07', competence: '2026-11', classification_status: 'confirmed', external_key: null },
        { id: '44444444-2222-4444-8444-444444444444', account_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', category_id: 'transfers', description: 'Reserva mensal', amount_cents: '50000', nature: 'own_transfer', reporting: 'neutral', source: 'manual', event_date: '2026-11-07', competence: '2026-11', classification_status: 'confirmed', external_key: null },
        { id: '88888888-2222-4888-8888-888888888888', account_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', category_id: 'savings', description: 'Aplicação importada', amount_cents: '-25000', nature: 'own_transfer', reporting: 'neutral', source: 'pluggy', event_date: '2026-11-08', competence: '2026-11', classification_status: 'confirmed', external_key: 'pluggy-savings-1' }
        ,{ id: '77777777-3333-4777-8777-777777777777', account_id: 'cccccccc-1111-4ccc-8ccc-cccccccccccc', category_id: null, description: 'Notebook 1/2', amount_cents: '-12000', nature: 'expense', reporting: 'expense', source: 'pluggy', event_date: '2026-11-08', competence: '2026-11', classification_status: 'uncategorized', external_key: 'pluggy-card-1' }
        ,{ id: '55555555-3333-4555-8555-555555555555', account_id: 'cccccccc-1111-4ccc-8ccc-cccccccccccc', category_id: null, description: 'Compra removida 1/2', amount_cents: '-9000', nature: 'expense', reporting: 'expense', source: 'pluggy', event_date: '2026-11-08', competence: '2026-11', classification_status: 'uncategorized', external_key: 'pluggy-card-deleted', source_deleted_at: '2026-11-18T10:00:00Z' }
        ,{ id: '66666666-3333-4666-8666-666666666666', account_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', category_id: null, description: 'Pagamento da fatura', amount_cents: '-12000', nature: 'card_payment', reporting: 'neutral', source: 'pluggy', event_date: '2026-11-10', competence: '2026-11', classification_status: 'automatic', external_key: 'pluggy-payment-1' }
        ,{ id: '10000000-3333-4000-8000-000000000001', account_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', category_id: 'salary', description: 'Salário histórico', amount_cents: '500000', nature: 'income', reporting: 'income', source: 'pluggy', event_date: '2026-06-05', competence: '2026-06', classification_status: 'confirmed', external_key: 'pluggy-salary-6' }
        ,{ id: '10000000-3333-4000-8000-000000000002', account_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', category_id: 'salary', description: 'Salário histórico', amount_cents: '500000', nature: 'income', reporting: 'income', source: 'pluggy', event_date: '2026-07-05', competence: '2026-07', classification_status: 'confirmed', external_key: 'pluggy-salary-7' }
        ,{ id: '10000000-3333-4000-8000-000000000003', account_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', category_id: 'salary', description: 'Salário histórico', amount_cents: '500000', nature: 'income', reporting: 'income', source: 'pluggy', event_date: '2026-08-05', competence: '2026-08', classification_status: 'confirmed', external_key: 'pluggy-salary-8' }
        ,{ id: '10000000-3333-4000-8000-000000000004', account_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', category_id: 'salary', description: 'Salário histórico', amount_cents: '500000', nature: 'income', reporting: 'income', source: 'pluggy', event_date: '2026-09-05', competence: '2026-09', classification_status: 'confirmed', external_key: 'pluggy-salary-9' }
        ,{ id: '10000000-3333-4000-8000-000000000005', account_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', category_id: 'salary', description: 'Salário histórico', amount_cents: '500000', nature: 'income', reporting: 'income', source: 'pluggy', event_date: '2026-10-05', competence: '2026-10', classification_status: 'confirmed', external_key: 'pluggy-salary-10' }
        ,{ id: '20000000-3333-4000-8000-000000000001', account_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', category_id: 'extraordinary_income', description: 'Bônus extraordinário', amount_cents: '120000', nature: 'income', reporting: 'income', source: 'pluggy', event_date: '2026-10-15', competence: '2026-10', classification_status: 'confirmed', external_key: 'pluggy-bonus-10' }
        ,...extraTransactions
      ]) });
      return;
    }
    if (url.pathname === '/rest/v1/transaction_links') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: '55555555-2222-4555-8555-555555555555', source_transaction_id: '33333333-2222-4333-8333-333333333333', target_transaction_id: '44444444-2222-4444-8444-444444444444', link_type: 'own_transfer' }]) });
      return;
    }
    if (url.pathname === '/rest/v1/category_budgets') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
        { id: '77777777-2222-4777-8777-777777777777', category_id: 'groceries', monthly_limit_cents: '50000' }
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
    if (url.pathname === '/rest/v1/transaction_classifications') {
      const confirmed = [...confirmedCategories].map(([transactionId, categoryId], index) => ({
        id: `90000000-2222-4000-8000-${String(index + 1).padStart(12, '0')}`,
        transaction_id: transactionId, category_id: categoryId, confidence_basis_points: 10000,
        status: 'confirmed', classifier_version: 'rules-v1',
        explanation: { evidence: [{ kind: 'alias', label: 'Correção confirmada', weightBasisPoints: 10000 }] }
      }));
      const suggested = [
        { id: '99999999-2222-4999-8999-999999999999', transaction_id: '99999999-3333-4999-8999-999999999999', category_id: 'groceries', confidence_basis_points: 8000, status: 'suggested', classifier_version: 'rules-v1', explanation: { evidence: [{ kind: 'token', label: 'Token da descrição', weightBasisPoints: 8000 }] } }
      ].filter(item => !confirmedCategories.has(item.transaction_id));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([...suggested, ...confirmed]) });
      return;
    }
    if (url.pathname === '/rest/v1/transaction_review_history') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
        { id: '92000000-2222-4000-8000-000000000001', transaction_id: '20000000-3333-4000-8000-000000000001', decision_type: 'classification',
          previous: { categoryId: 'salary', classifierVersion: 'rules-v1' }, superseded_at: '2026-11-17T12:00:00Z' }
      ]) });
      return;
    }
    if (url.pathname === '/rest/v1/transaction_semantic_overrides') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([...semanticOverrides.values()]) });
      return;
    }
    if (url.pathname === '/rest/v1/credit_cards') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
        { id: 'cccccccc-2222-4ccc-8ccc-cccccccccccc', account_id: 'cccccccc-1111-4ccc-8ccc-cccccccccccc', closing_day: 3, due_day: 10, credit_limit_cents: '500000' }
      ]) });
      return;
    }
    if (url.pathname === '/rest/v1/card_statements') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
        { id: 'dddddddd-2222-4ddd-8ddd-dddddddddddd', card_id: 'cccccccc-2222-4ccc-8ccc-cccccccccccc', competence: '2026-11', closing_date: '2026-11-03', due_date: '2026-11-10' }
      ]) });
      return;
    }
    if (url.pathname === '/rest/v1/card_statement_entries') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
        { id: 'eeeeeeee-2222-4eee-8eee-eeeeeeeeeeee', statement_id: 'dddddddd-2222-4ddd-8ddd-dddddddddddd', transaction_id: '77777777-3333-4777-8777-777777777777', entry_type: 'purchase' }
        ,{ id: 'eeeeeeee-3333-4eee-8eee-eeeeeeeeeeee', statement_id: 'dddddddd-2222-4ddd-8ddd-dddddddddddd', transaction_id: '55555555-3333-4555-8555-555555555555', entry_type: 'purchase' }
      ]) });
      return;
    }
    if (url.pathname === '/rest/v1/card_installments') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
        { id: 'ffffffff-2222-4fff-8fff-ffffffffffff', card_id: 'cccccccc-2222-4ccc-8ccc-cccccccccccc', statement_id: 'dddddddd-2222-4ddd-8ddd-dddddddddddd', transaction_id: '77777777-3333-4777-8777-777777777777', purchase_group_key: 'notebook-2', description: 'Notebook', installment_number: 1, total_installments: 2, amount_cents: '12000', due_competence: '2026-11', status: 'posted' },
        { id: 'ffffffff-3333-4fff-8fff-ffffffffffff', card_id: 'cccccccc-2222-4ccc-8ccc-cccccccccccc', statement_id: 'dddddddd-2222-4ddd-8ddd-dddddddddddd', transaction_id: null, purchase_group_key: 'notebook-2', description: 'Notebook', installment_number: 2, total_installments: 2, amount_cents: '12000', due_competence: '2026-12', status: 'projected' },
        { id: 'ffffffff-4444-4fff-8fff-ffffffffffff', card_id: 'cccccccc-2222-4ccc-8ccc-cccccccccccc', statement_id: 'dddddddd-2222-4ddd-8ddd-dddddddddddd', transaction_id: '55555555-3333-4555-8555-555555555555', purchase_group_key: 'deleted-2', description: 'Compra removida', installment_number: 1, total_installments: 2, amount_cents: '9000', due_competence: '2026-11', status: 'posted' },
        { id: 'ffffffff-5555-4fff-8fff-ffffffffffff', card_id: 'cccccccc-2222-4ccc-8ccc-cccccccccccc', statement_id: 'dddddddd-2222-4ddd-8ddd-dddddddddddd', transaction_id: null, purchase_group_key: 'deleted-2', description: 'Compra removida', installment_number: 2, total_installments: 2, amount_cents: '9000', due_competence: '2026-12', status: 'projected' }
      ]) });
      return;
    }
    if (url.pathname === '/rest/v1/pluggy_connections') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
        { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', institution_name: 'Banco Sintético', status: 'ready', last_source_updated_at: '2026-11-13T12:00:00Z', last_attempt_at: '2026-11-18T13:00:00Z', last_success_at: '2026-11-18T13:00:00Z', last_error: null }
      ]) });
      return;
    }
    if (url.pathname === '/rest/v1/sync_runs') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
        { id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', connection_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', status: 'succeeded', trigger_type: 'initial', imported_accounts: 1, imported_transactions: 2, skipped_transactions: 0, created_at: '2026-11-14T12:00:00Z' }
      ]) });
      return;
    }
    if (url.pathname === '/functions/v1/pluggy-sync') {
      rpcCalls.push({ path: url.pathname, body: route.request().postData() });
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ importedAccounts: 0, importedTransactions: 0, skippedTransactions: 0 }) });
      return;
    }
    if (url.pathname.startsWith('/rest/v1/rpc/')) {
      if (url.pathname.endsWith('/get_category_usage')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
          { category_id: 'salary', dependency_count: 6 }, { category_id: 'groceries', dependency_count: 3 },
          { category_id: 'restaurants', dependency_count: 0 }, { category_id: 'custom_hobbies', dependency_count: 0 }
        ]) });
        return;
      }
      if (url.pathname.endsWith('/get_account_institutions')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
        return;
      }
      rpcCalls.push({ path: url.pathname, body: route.request().postData() });
      if (url.pathname.endsWith('/set_holder_name')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ paired: 5, neutralized: 41 }) });
        return;
      }
      const body = JSON.parse(route.request().postData() ?? '{}') as Record<string, string | null>;
      if (url.pathname.endsWith('/confirm_transaction_classification') && body.p_transaction_id && body.p_category_id) {
        confirmedCategories.set(body.p_transaction_id, body.p_category_id);
      }
      if (url.pathname.endsWith('/confirm_transaction_semantics') && body.p_transaction_id && body.p_effective_nature) {
        semanticOverrides.set(body.p_transaction_id, {
          id: '91000000-2222-4000-8000-000000000001', transaction_id: body.p_transaction_id,
          effective_nature: body.p_effective_nature,
          effective_reporting: body.p_effective_nature === 'income' ? 'income' : body.p_effective_nature === 'expense' ? 'expense' : 'neutral',
          counterpart_transaction_id: body.p_counterpart_transaction_id,
          statement_id: body.p_statement_id, savings_box_id: body.p_savings_box_id,
          reason: 'owner_confirmation', semantic_version: 'semantics-v1', updated_at: '2026-11-17T12:00:00Z'
        });
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify('66666666-2222-4666-8666-666666666666') });
      return;
    }
    await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  });
}

test('protege a aplicação, autentica o proprietário e encerra a sessão', async ({ page }) => {
  await mockSupabase(page);
  await page.goto('/#overview');

  await expect(page.getByRole('heading', { name: 'Entrar', level: 1 })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toHaveCount(0);

  await page.getByLabel('E-mail').fill('owner@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('uma-senha-local-segura');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible();
  await expect(page.getByText('owner@example.test')).toHaveCount(0);
  // Sair mora no menu da conta (D-042) e sempre pede confirmação, começando no Cancelar (D-041).
  await page.getByRole('button', { name: 'Menu da conta' }).click();
  await page.getByRole('menu', { name: 'Menu da conta' }).getByRole('menuitem', { name: 'Sair' }).click();
  const confirm = page.getByRole('dialog', { name: 'Sair da conta' });
  await expect(confirm.getByRole('button', { name: 'Cancelar' })).toBeFocused();
  await confirm.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Menu da conta' })).toBeFocused();
  await page.getByRole('button', { name: 'Menu da conta' }).click();
  await page.getByRole('menuitem', { name: 'Sair' }).click();
  await page.getByRole('dialog', { name: 'Sair da conta' }).getByRole('button', { name: 'Sair' }).click();
  await expect(page.getByRole('heading', { name: 'Entrar', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Mostrar senha' }).click();
  await expect(page.getByLabel('Senha', { exact: true })).toHaveAttribute('type', 'text');
});

/** Camada flutuante na top layer e sem corte: o ponto central do item pertence à própria camada. */
async function expectOnTop(layer: ReturnType<Page['locator']>, item: ReturnType<Page['locator']>) {
  expect(await layer.evaluate(element => element.closest(':popover-open') !== null)).toBe(true);
  await item.scrollIntoViewIfNeeded();
  expect(await item.evaluate(element => {
    const rect = element.getBoundingClientRect();
    return element.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2));
  })).toBe(true);
}

async function login(page: Page) {
  await page.goto('/#overview');
  await page.getByLabel('E-mail').fill('owner@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('uma-senha-local-segura');
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
  await page.getByLabel('Senha', { exact: true }).fill('uma-senha-local-segura');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('alert')).toContainText('não está autorizada');
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toHaveCount(0);
});

test('deriva o resumo do livro sem contar a transferência como receita ou despesa', async ({ page }) => {
  await mockSupabase(page);
  await login(page);
  const indicators = page.getByLabel('Indicadores do livro financeiro');
  await expect(indicators.getByText('R$ 5.000,00', { exact: true })).toBeVisible();
  await expect(indicators.getByText('R$ 230,00', { exact: true })).toBeVisible();
  await expect(indicators.getByText('+ R$ 230,00 vs. out/2026')).toBeVisible();
  await expect(indicators.getByText('+ R$ 4.770,00', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Precisa de atenção' })).toContainText('4 lançamentos para revisar');
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
  await page.getByLabel('Valor', { exact: true }).fill('250,00');
  await page.getByLabel('Tipo').selectOption('transfer');
  await page.getByLabel('Conta de origem').selectOption('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  await page.getByLabel('Conta de destino').selectOption('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByText('Transferência conciliada nas duas contas.')).toBeVisible();
  expect(rpcCalls).toHaveLength(1);
  expect(rpcCalls[0].path).toContain('create_manual_transfer');
  expect(rpcCalls[0].body).toContain('25000');
});

test('contas: grupos por tipo, edição e arquivamento sem perder lançamentos', async ({ page }) => {
  const writes: { path: string; body: string | null }[] = [];
  await mockSupabase(page, true, writes);
  await login(page);
  await page.getByRole('link', { name: /Contas/ }).click();

  const checking = page.getByRole('region', { name: /Contas correntes/ });
  await expect(checking.getByRole('heading', { name: 'Conta principal', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: /Reservas e investimentos/ }).getByRole('heading', { name: 'Reserva', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: /Cartões de crédito/ }).getByRole('heading', { name: 'Cartão principal', exact: true })).toBeVisible();
  await expect(checking.getByRole('link', { name: 'Ver lançamentos' })).toHaveAttribute('href', /account=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/);

  await page.getByRole('button', { name: 'Editar conta Conta principal' }).click();
  const edit = page.getByRole('dialog', { name: 'Editar Conta principal' });
  await expect(edit.getByLabel('Tipo')).toBeDisabled();
  await expect(edit.getByLabel('Saldo inicial', { exact: true })).toHaveValue('1.000,00');
  await edit.getByLabel('Nome da conta').fill('Conta do dia a dia');
  await edit.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByText('Conta atualizada.')).toBeVisible();

  await page.getByRole('button', { name: 'Editar conta Conta principal' }).click();
  await page.getByRole('dialog', { name: 'Editar Conta principal' }).getByRole('button', { name: 'Arquivar conta' }).click();
  await page.getByRole('dialog', { name: 'Arquivar conta' }).getByRole('button', { name: 'Arquivar', exact: true }).click();
  await expect(page.getByText('Conta arquivada; os lançamentos continuam no livro.')).toBeVisible();

  expect(writes.map(write => write.path)).toEqual(['/rest/v1/rpc/update_financial_account', '/rest/v1/rpc/archive_financial_account']);
  expect(writes[0].body).toContain('Conta do dia a dia');
  expect(writes[0].body).toContain('100000');
  expect(writes[1].body).toContain('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
});

test('cadastra conta e envia ajuste vinculado ao lançamento original', async ({ page }) => {
  const writes: { path: string; body: string | null }[] = [];
  await mockSupabase(page, true, writes);
  await login(page);
  await page.getByRole('link', { name: /Contas/ }).click();
  await page.getByRole('button', { name: 'Nova conta' }).click();
  await page.getByLabel('Nome da conta').fill('Conta de testes');
  await page.getByLabel('Saldo inicial', { exact: true }).fill('1.000,00');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByText('Conta cadastrada.')).toBeVisible();

  await page.getByRole('button', { name: 'Nova movimentação' }).click();
  const transactionDialog = page.getByRole('dialog', { name: 'Nova movimentação' });
  await transactionDialog.getByLabel('Descrição').fill('Correção de tarifa');
  await transactionDialog.getByLabel('Valor', { exact: true }).fill('12,50');
  await transactionDialog.getByLabel('Tipo').selectOption('adjustment_expense');
  await transactionDialog.getByLabel('Conta').selectOption('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  await transactionDialog.getByLabel('Categoria').selectOption('groceries');
  await transactionDialog.getByLabel('Lançamento original').selectOption('22222222-2222-4222-8222-222222222222');
  await transactionDialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByText('Ajuste vinculado ao lançamento original.')).toBeVisible();
  expect(writes.map(write => write.path)).toEqual(['/rest/v1/financial_accounts', '/rest/v1/rpc/create_manual_transaction']);
  expect(writes[1].body).toContain('22222222-2222-4222-8222-222222222222');
  expect(writes[1].body).toContain('-1250');
});

test('agrupa metas por situação, cria, edita e exclui meta por categoria', async ({ page }) => {
  const writes: { path: string; body: string | null }[] = [];
  await mockSupabase(page, true, writes);
  await login(page);
  await page.getByRole('link', { name: /Orçamentos/ }).click();

  const summary = page.getByLabel('Resumo das metas por categoria');
  await expect(summary.getByText('+ R$ 5.000,00')).toBeVisible();
  await expect(summary.getByText('10% da receita · R$ 4.500,00 livre')).toBeVisible();
  await expect(page.getByText('Teto de R$ 500,00 por mês')).toBeVisible();
  const within = page.getByRole('region', { name: /Dentro do teto/ });
  await expect(within.getByRole('heading', { name: 'Supermercado' })).toBeVisible();
  await expect(within.getByText('R$ 100,00 de R$ 500,00')).toBeVisible();
  await expect(within.getByText('R$ 400,00')).toBeVisible();
  await expect(page.getByRole('region', { name: /Acima do teto/ })).toHaveCount(0);
  await expect(page.getByText('Nenhum gasto categorizado fora das metas neste período.')).toBeVisible();

  await page.getByRole('button', { name: 'Definir meta', exact: true }).click();
  const create = page.getByRole('dialog', { name: 'Definir meta' });
  await expect(create.getByLabel('Categoria').locator('option[value="groceries"]')).toHaveCount(0);
  await create.getByLabel('Categoria').selectOption('restaurants');
  await create.getByLabel('Teto mensal').fill('1.250,50');
  await create.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByText('Meta por categoria salva.')).toBeVisible();
  expect(writes.at(-1)?.path).toContain('set_category_budget');
  expect(writes.at(-1)?.body).toContain('restaurants');
  expect(writes.at(-1)?.body).toContain('"p_monthly_limit_cents":"125050"');

  await page.getByRole('button', { name: 'Editar meta de Supermercado' }).click();
  const edit = page.getByRole('dialog', { name: 'Editar meta de Supermercado' });
  await expect(edit.getByLabel('Categoria')).toBeDisabled();
  await expect(edit.getByLabel('Teto mensal')).toHaveValue('500,00');
  await edit.getByLabel('Teto mensal').fill('750');
  await edit.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByText('Meta atualizada.')).toBeVisible();
  expect(writes.at(-1)?.path).toContain('set_category_budget');
  expect(writes.at(-1)?.body).toContain('groceries');
  expect(writes.at(-1)?.body).toContain('"p_monthly_limit_cents":"75000"');

  await page.getByRole('button', { name: 'Editar meta de Supermercado' }).click();
  await page.getByRole('dialog', { name: 'Editar meta de Supermercado' }).getByRole('button', { name: 'Excluir meta' }).click();
  const confirm = page.getByRole('dialog', { name: 'Excluir meta' });
  await confirm.getByRole('button', { name: 'Excluir', exact: true }).click();
  await expect(page.getByText('Meta excluída.')).toBeVisible();
  expect(writes.at(-1)?.path).toContain('delete_category_budget');
  expect(writes.at(-1)?.body).toContain('groceries');
  expect(writes).toHaveLength(3);

  await page.getByRole('button', { name: 'Anual' }).click();
  await expect(page.getByRole('group', { name: 'Período das metas' })).toContainText('Ano 2026');
  await expect(summary.getByText('+ R$ 31.200,00')).toBeVisible();
});

test('caixinhas: situação, aporte, gaveta de movimentos, edição e exclusão', async ({ page }) => {
  const writes: { path: string; body: string | null }[] = [];
  await mockSupabase(page, true, writes);
  await login(page);
  await page.getByRole('link', { name: /Caixinhas/ }).click();

  // Sem aportes recentes e com data-alvo: abaixo do ritmo.
  const behind = page.getByRole('region', { name: /Abaixo do ritmo/ });
  await expect(behind.getByRole('heading', { name: 'Reserva de emergência' })).toBeVisible();
  await expect(behind.getByText('R$ 1.000,00 de R$ 10.000,00')).toBeVisible();
  await expect(page.getByLabel('Resumo das caixinhas').getByText('R$ 9.000,00')).toBeVisible();

  await page.getByRole('button', { name: 'Nova caixinha' }).click();
  const boxDialog = page.getByRole('dialog', { name: 'Nova caixinha' });
  await boxDialog.getByLabel('Nome da caixinha').fill('Viagem');
  await boxDialog.getByLabel('Saldo inicial', { exact: true }).fill('100,00');
  await boxDialog.getByLabel('Meta', { exact: true }).fill('2.000,00');
  await boxDialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByText('Caixinha cadastrada.')).toBeVisible();

  await behind.getByRole('button', { name: 'Aportar' }).click();
  const movementDialog = page.getByRole('dialog', { name: 'Registrar aporte' });
  await expect(movementDialog.getByLabel('Tipo de movimento')).toHaveValue('contribution');
  await movementDialog.getByLabel('Conta').selectOption('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  await movementDialog.getByLabel('Descrição').fill('Aporte mensal');
  await movementDialog.getByLabel('Valor', { exact: true }).fill('250,00');
  await movementDialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByText('Movimento da caixinha registrado.')).toBeVisible();

  await behind.getByRole('button', { name: 'Movimentos · 0' }).click();
  const drawer = page.getByRole('dialog', { name: 'Movimentos de Reserva de emergência' });
  await expect(drawer.getByText('Nenhum aporte ou resgate ainda.', { exact: false })).toBeVisible();
  await drawer.getByRole('button', { name: 'Associar lançamento importado' }).click();
  const linkDialog = page.getByRole('dialog', { name: 'Associar lançamento importado' });
  await linkDialog.getByLabel('Lançamento importado').selectOption('88888888-2222-4888-8888-888888888888');
  await linkDialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByText('Lançamento associado à caixinha.')).toBeVisible();

  await page.getByRole('button', { name: 'Editar caixinha Reserva de emergência' }).click();
  const edit = page.getByRole('dialog', { name: 'Editar Reserva de emergência' });
  await expect(edit.getByLabel('Saldo inicial', { exact: true })).toHaveValue('1.000,00');
  await expect(edit.getByLabel('Meta', { exact: true })).toHaveValue('10.000,00');
  await edit.getByLabel('Meta', { exact: true }).fill('12.000,00');
  await edit.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByText('Caixinha atualizada.')).toBeVisible();

  await page.getByRole('button', { name: 'Editar caixinha Reserva de emergência' }).click();
  await page.getByRole('dialog', { name: 'Editar Reserva de emergência' }).getByRole('button', { name: 'Excluir caixinha' }).click();
  await page.getByRole('dialog', { name: 'Excluir caixinha' }).getByRole('button', { name: 'Excluir', exact: true }).click();
  await expect(page.getByText('Caixinha excluída.')).toBeVisible();

  expect(writes.map(write => write.path)).toEqual([
    '/rest/v1/rpc/create_savings_box',
    '/rest/v1/rpc/create_savings_movement',
    '/rest/v1/rpc/link_savings_movement',
    '/rest/v1/rpc/update_savings_box',
    '/rest/v1/rpc/delete_savings_box'
  ]);
  expect(writes[1].body).toContain('25000');
  expect(writes[2].body).toContain('88888888-2222-4888-8888-888888888888');
  expect(writes[3].body).toContain('1200000');
  expect(writes[4].body).toContain('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
});

test('mantém as telas reais do livro sem violações WCAG A/AA detectáveis', async ({ page }) => {
  await mockSupabase(page);
  await login(page);
  for (const destination of ['overview', 'transactions', 'accounts', 'cards', 'budgets', 'savings', 'categories', 'connections', 'review']) {
    await page.goto(`/#${destination}`);
    await expect(page.getByRole('main')).toBeVisible();
    // Axe mede cor real: espera as entradas (fade/rise) terminarem para não medir texto translúcido.
    await page.waitForFunction(() => document.getAnimations().every(animation => animation.playState !== 'running' || animation.effect?.getTiming().iterations === Infinity));
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(results.violations).toEqual([]);
  }
});

test('cria, edita e arquiva categoria personalizada com identidade visual', async ({ page }) => {
  const writes: { path: string; body: string | null }[] = [];
  await mockSupabase(page, true, writes);
  await login(page);
  await page.goto('/#categories');

  const structural = page.getByRole('region', { name: /Estruturais/ });
  await expect(structural.getByRole('row', { name: /Salário/ })).toContainText('Protegida');
  await expect(page.getByRole('region', { name: /Personalizadas/ }).getByRole('row', { name: /Hobbies/ })).toBeVisible();
  await page.getByRole('group', { name: 'Aplicação' }).getByRole('button', { name: 'Receitas' }).click();
  await expect(structural.getByRole('row', { name: /Supermercado/ })).toHaveCount(0);
  await expect(structural.getByRole('row', { name: /Salário/ })).toBeVisible();
  await page.getByRole('group', { name: 'Aplicação' }).getByRole('button', { name: 'Todas' }).click();
  await page.getByRole('button', { name: 'Nova categoria' }).click();
  const createDialog = page.getByRole('dialog', { name: 'Nova categoria' });
  await createDialog.getByLabel('Nome').fill('Pets');
  await createDialog.getByRole('combobox', { name: /^Ícone/ }).click();
  const iconList = page.getByRole('listbox', { name: /^Ícone/ });
  await expectOnTop(iconList, iconList.getByRole('option').last());
  // D-059: a busca acha por sinônimo e ignora acento; Enter escolhe o primeiro resultado.
  const iconSearch = page.getByRole('searchbox', { name: 'Pesquisar ícone' });
  await expect(iconSearch).toBeFocused();
  await iconSearch.fill('luz');
  await expect(iconList.getByRole('option')).toHaveText(['Energia']);
  await iconSearch.fill('xyz');
  await expect(iconList).toContainText('Nada encontrado para “xyz”.');
  await iconSearch.fill('saude');
  await createDialog.getByRole('option', { name: 'Saúde' }).click();
  await expect(createDialog.getByRole('combobox', { name: /^Ícone/ })).toHaveText('Saúde');
  await createDialog.getByRole('combobox', { name: /^Cor/ }).click();
  await createDialog.getByRole('option', { name: 'Âmbar' }).click();
  await createDialog.getByLabel('Despesa').check();
  await createDialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByText('Categoria criada.')).toBeVisible();

  const hobbies = page.getByRole('row', { name: /Hobbies/ });
  await hobbies.getByRole('button', { name: 'Editar Hobbies' }).click();
  const editDialog = page.getByRole('dialog', { name: 'Editar categoria' });
  await editDialog.getByLabel('Nome').fill('Lazer pessoal');
  const iconPicker = editDialog.getByRole('combobox', { name: /^Ícone/ });
  await iconPicker.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('searchbox', { name: 'Pesquisar ícone' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(editDialog.getByRole('option', { name: 'Lazer' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(iconPicker).toBeFocused();
  await expect(editDialog.getByRole('listbox')).toHaveCount(0);
  await page.keyboard.press('ArrowDown');
  await editDialog.getByRole('option', { name: 'Presente' }).press('Enter');
  await expect(iconPicker).toHaveText('Presente');
  await expect(iconPicker).toBeFocused();
  await editDialog.getByRole('combobox', { name: /^Cor/ }).click();
  await editDialog.getByRole('option', { name: 'Azul' }).click();
  await editDialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByText('Categoria atualizada.')).toBeVisible();

  await hobbies.getByRole('button', { name: 'Arquivar Hobbies' }).click();
  const removalDialog = page.getByRole('dialog', { name: 'Arquivar ou excluir categoria' });
  await expect(removalDialog.getByRole('button', { name: /Excluir definitivamente/ })).toBeVisible();
  await removalDialog.getByRole('button', { name: /Arquivar$/ }).click();
  await expect.poll(() => writes.some(write => write.path.endsWith('/archive_category'))).toBe(true);

  expect(writes.map(write => write.path)).toEqual([
    '/rest/v1/rpc/create_category', '/rest/v1/rpc/update_category', '/rest/v1/rpc/archive_category'
  ]);
  expect(JSON.parse(writes[0]!.body!)).toMatchObject({ p_icon_key: 'heart-pulse', p_color_key: 'chart-category-4' });
  expect(JSON.parse(writes[1]!.body!)).toMatchObject({ p_icon_key: 'gift', p_color_key: 'chart-category-1' });
});

test('configura ciclo, projeta parcelas e vincula pagamento de fatura como neutro', async ({ page }) => {
  const writes: { path: string; body: string | null }[] = [];
  await mockSupabase(page, true, writes);
  await login(page);
  await page.goto('/#cards');
  const statements = page.getByRole('tablist', { name: 'Faturas do Cartão principal' });
  await expect(statements.getByRole('tab', { name: /nov\/2026/ })).toHaveAttribute('aria-selected', 'true');
  await expect(statements).toContainText('Em aberto · R$ 120,00');
  await expect(page.getByText('R$ 240,00 de R$ 5.000,00 · 4,8%')).toBeVisible();
  // D-042: a fatura abre com os lançamentos recolhidos.
  const toggle = page.getByRole('tabpanel').getByRole('button', { name: /^Lançamentos/ });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('tabpanel').getByText('Notebook 1/2')).toBeHidden();
  await toggle.click();
  await expect(page.getByRole('tabpanel').getByText('Notebook 1/2')).toBeVisible();
  await statements.getByRole('tab', { name: /nov\/2026/ }).press('ArrowRight');
  await expect(statements.getByRole('tab', { name: /dez\/2026/ })).toBeFocused();
  // Trocar de aba recolhe de novo.
  await expect(page.getByRole('tabpanel').getByRole('button', { name: /^Lançamentos/ })).toHaveAttribute('aria-expanded', 'false');
  await page.getByRole('tabpanel').getByRole('button', { name: /^Lançamentos/ }).click();
  await expect(page.getByRole('tabpanel').getByText('Notebook 2/2')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Vincular pagamento' })).toHaveCount(0);
  await statements.getByRole('tab', { name: /nov\/2026/ }).click();

  await expect(page.getByText('Compra removida')).toHaveCount(0);
  await expect(page.getByText('R$ 90,00')).toHaveCount(0);

  await page.getByRole('button', { name: 'Configurar' }).click();
  const cardDialog = page.getByRole('dialog', { name: 'Configurar cartão' });
  await cardDialog.getByLabel('Dia de fechamento').fill('4');
  await cardDialog.getByLabel('Dia de vencimento').fill('12');
  await cardDialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByText('Calendário do cartão salvo.')).toBeVisible();

  await page.getByRole('button', { name: 'Vincular pagamento' }).click();
  const paymentDialog = page.getByRole('dialog', { name: 'Vincular pagamento' });
  await paymentDialog.getByLabel('Pagamento de fatura').selectOption('66666666-3333-4666-8666-666666666666');
  await paymentDialog.getByRole('button', { name: 'Vincular pagamento' }).click();
  await expect(page.getByText('Pagamento vinculado sem duplicar a despesa.')).toBeVisible();

  expect(writes.find(write => write.path.endsWith('/configure_credit_card'))?.body).toContain('500000');
  expect(writes.find(write => write.path.endsWith('/link_card_payment'))?.body).toContain('66666666-3333-4666-8666-666666666666');
});

test('projeta seis meses sem incluir receita extraordinária na média futura', async ({ page }) => {
  await mockSupabase(page);
  await login(page);
  await page.goto('/#reports');
  await expect(page.getByRole('table', { name: 'Previsão financeira de seis meses' })).toBeVisible();
  await expect(page.getByText('R$ 5.000,00', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('R$ 1.200,00', { exact: true })).toBeVisible();
  const december = page.getByRole('table', { name: 'Previsão financeira de seis meses' }).getByRole('row', { name: /dez\/2026/ });
  await expect(december).toBeVisible();
  await expect(december.locator('.ui-financial-value')).toHaveClass(/ui-financial-value--(positive|negative|neutral)/);
});

test('exibe estado da fonte e solicita sincronização sem enviar credenciais', async ({ page }) => {
  const writes: { path: string; body: string | null }[] = [];
  await mockSupabase(page, true, writes);
  await login(page);
  await page.goto('/#connections');
  await expect(page.getByRole('heading', { name: 'Conexões bancárias' })).toBeVisible();
  const ready = page.getByRole('region', { name: /Atualizadas/ });
  await expect(ready.getByRole('heading', { name: 'Banco Sintético' })).toBeVisible();
  await expect(ready.getByText('Atualizada', { exact: true })).toBeVisible();
  await expect(ready).toContainText('13/11/2026');
  await expect(page.getByLabel('Resumo das conexões')).toContainText('Tudo certo');
  await page.getByRole('button', { name: 'Sincronizar agora' }).click();
  await expect.poll(() => writes.some(write => write.path === '/functions/v1/pluggy-sync')).toBe(true);
  const syncCall = writes.find(write => write.path === '/functions/v1/pluggy-sync');
  expect(syncCall?.body).toContain('dddddddd-dddd-4ddd-8ddd-dddddddddddd');
  expect(syncCall?.body).not.toMatch(/client|secret|api.?key/i);
});

test('sincroniza ao abrir a conexão sem tentativa há mais de 6 h e avisa se falhar (D-061)', async ({ page }) => {
  const writes: { path: string; body: string | null }[] = [];
  await mockSupabase(page, true, writes);
  // Registrada depois do mock, esta rota tem prioridade: a conexão foi tentada há 4 dias.
  await page.route('http://127.0.0.1:54321/rest/v1/pluggy_connections*', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify([{ id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', institution_name: 'Banco Sintético', status: 'ready', last_source_updated_at: '2026-11-13T12:00:00Z', last_attempt_at: '2026-11-14T12:00:00Z', last_success_at: '2026-11-14T12:00:00Z', last_error: null }])
  }));
  let release: () => void = () => {};
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route('http://127.0.0.1:54321/functions/v1/pluggy-sync', async route => {
    writes.push({ path: '/functions/v1/pluggy-sync', body: route.request().postData() });
    await held;
    await route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ error: 'pluggy_request_500' }) });
  });
  await login(page);
  await expect(page.getByRole('status').filter({ hasText: 'Atualizando contas…' })).toBeVisible();
  release();
  await expect(page.getByRole('status').filter({ hasText: 'Não foi possível atualizar as contas automaticamente.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ver conexões' })).toHaveAttribute('href', '#connections');
  const calls = writes.filter(write => write.path === '/functions/v1/pluggy-sync');
  expect(calls).toHaveLength(1);
  expect(calls[0]?.body).toContain('dddddddd-dddd-4ddd-8ddd-dddddddddddd');
});

test('não sincroniza ao abrir quando a última tentativa é recente (D-061)', async ({ page }) => {
  const writes: { path: string; body: string | null }[] = [];
  await mockSupabase(page, true, writes);
  await login(page);
  await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible();
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.waitForTimeout(300);
  expect(writes.some(write => write.path === '/functions/v1/pluggy-sync')).toBe(false);
});

test('nome do titular em Conta aplica a regra de Pix para si mesmo (D-062)', async ({ page }) => {
  const writes: { path: string; body: string | null }[] = [];
  await mockSupabase(page, true, writes);
  await login(page);
  await page.getByRole('button', { name: 'Menu da conta' }).click();
  await page.getByRole('menuitem', { name: 'Nome do titular' }).click();
  const dialog = page.getByRole('dialog', { name: 'Nome do titular' });
  await dialog.getByLabel('Nome completo').fill('Titular');
  await dialog.getByRole('button', { name: 'Salvar' }).click();
  await expect(dialog.getByText('Informe nome e sobrenome.')).toBeVisible();
  expect(writes.some(write => write.path === '/rest/v1/rpc/set_holder_name')).toBe(false);
  await dialog.getByLabel('Nome completo').fill('  Titular   Sintético ');
  await dialog.getByLabel('Nome completo').press('Enter');
  await expect(page.getByText('Nome salvo. 5 transferências vinculadas e 41 Pix neutralizados.')).toBeVisible();
  const call = writes.find(write => write.path === '/rest/v1/rpc/set_holder_name');
  expect(JSON.parse(call?.body ?? '{}')).toEqual({ p_name: 'Titular Sintético' });
});

test('avisa quando não consegue iniciar uma conexão bancária', async ({ page }) => {
  await mockSupabase(page);
  await page.route('http://127.0.0.1:54321/functions/v1/pluggy-connect-token', route => route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'authentication_required' })
  }));
  await login(page);
  await page.goto('/#connections');

  await page.getByRole('button', { name: 'Conectar instituição' }).first().click();

  await expect(page.getByRole('alert')).toContainText('Não foi possível concluir a conexão. Tente novamente.');
});

test('avisa quando a importação falha após o widget concluir a conexão', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).PluggyConnect = class {
      constructor(private readonly options: any) {}
      init() {
        this.options.onSuccess({ item: { id: 'synthetic-item' } });
        this.options.onClose();
      }
    };
  });
  await mockSupabase(page);
  await page.route('http://127.0.0.1:54321/functions/v1/pluggy-connect-token', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ connectToken: 'synthetic-connect-token' })
  }));
  await page.route('http://127.0.0.1:54321/functions/v1/pluggy-sync', route => route.fulfill({
    status: 502,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'pluggy_request_410' })
  }));
  await login(page);
  await page.goto('/#connections');

  await page.getByRole('button', { name: 'Conectar instituição' }).click();

  await expect(page.getByRole('alert')).toContainText('Não foi possível concluir a conexão. Tente novamente.');
});

test('explica sugestão e aprende somente após confirmação', async ({ page }) => {
  const writes: { path: string; body: string | null }[] = [];
  await mockSupabase(page, true, writes);
  await login(page);
  await page.goto('/#review');
  await expect(page.getByRole('heading', { name: 'Revisão de categorias' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Pendências · 4' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('80%')).toBeVisible();
  await expect(page.getByText('Token da descrição')).toBeVisible();
  await page.getByRole('listitem').filter({ hasText: 'Café sintético' }).getByRole('button', { name: 'Alterar' }).click();
  const dialog = page.getByRole('dialog', { name: 'Revisar lançamento' });
  await dialog.getByLabel('Categoria confirmada').selectOption('restaurants');
  await dialog.getByRole('button', { name: 'Confirmar revisão' }).click();
  await expect(page.getByText('Revisão confirmada e alias aprendido.')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Pendências · 3' })).toBeVisible();
  await page.getByRole('tab', { name: /Histórico/ }).click();
  await expect(page.getByRole('row', { name: /Café sintético/ }).getByRole('button', { name: 'Revisar novamente' })).toBeVisible();
  const confirmation = writes.find(write => write.path === '/rest/v1/rpc/confirm_transaction_classification');
  expect(confirmation?.body).toContain('99999999-3333-4999-8999-999999999999');
  expect(confirmation?.body).toContain('restaurants');
});

test('confirma a sugestão direto da fila e filtra pendências por motivo', async ({ page }) => {
  const writes: { path: string; body: string | null }[] = [];
  await mockSupabase(page, true, writes);
  await login(page);
  await page.goto('/#review');
  const reasons = page.getByRole('group', { name: 'Motivo' });
  await reasons.getByRole('button', { name: 'Vínculos 2' }).click();
  await expect(page).toHaveURL(/reason=links/);
  await expect(page.getByRole('region', { name: /Categorizar/ })).toHaveCount(0);
  await reasons.getByRole('button', { name: 'Categorias 2' }).click();
  await expect(page.getByRole('region', { name: /Vincular/ })).toHaveCount(0);
  const item = page.getByRole('listitem').filter({ hasText: 'Café sintético' });
  await expect(item).toContainText('Sugestão: Supermercado');
  await item.getByRole('button', { name: 'Confirmar Supermercado para Café sintético' }).click();
  await expect(page.getByText('Revisão confirmada e alias aprendido.')).toBeVisible();
  const confirmation = writes.find(write => write.path === '/rest/v1/rpc/confirm_transaction_classification');
  expect(confirmation?.body).toContain('groceries');
  await expect(page.getByRole('button', { name: 'Filtros' })).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('main').getByLabel('Conta', { exact: true })).toBeHidden();
});

test('exige e persiste vínculo de fatura ou caixinha na revisão semântica', async ({ page }) => {
  const writes: { path: string; body: string | null }[] = [];
  await mockSupabase(page, true, writes);
  await login(page);
  await page.goto('/#review');

  await page.getByRole('region', { name: /Vincular/ }).getByRole('listitem').filter({ hasText: 'Pagamento da fatura' }).getByRole('button', { name: 'Vincular' }).click();
  let dialog = page.getByRole('dialog', { name: 'Revisar lançamento' });
  // D-051: seletor rico — fatura pelo vencimento, período de compras e valor em aberto.
  const statementPicker = dialog.getByRole('combobox', { name: /Fatura paga/ });
  await expect(statementPicker).toBeVisible();
  await statementPicker.click();
  const option = dialog.getByRole('option', { name: /vence 10\/11/ });
  await expect(option).toContainText('compras de');
  await expect(option).toContainText('em aberto de');
  await option.click();
  await expect(statementPicker).toBeFocused();
  await expect(dialog.getByText(/Pendente após o vínculo|difere do em aberto/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Confirmar revisão' }).click();
  await expect(page.getByText('Natureza e vínculo confirmados.')).toBeVisible();

  await page.getByRole('region', { name: /Vincular/ }).getByRole('listitem').filter({ hasText: 'Aplicação importada' }).getByRole('button', { name: 'Vincular' }).click();
  dialog = page.getByRole('dialog', { name: 'Revisar lançamento' });
  await dialog.getByLabel('Natureza financeira').selectOption('savings_contribution');
  await dialog.getByLabel('Caixinha').selectOption('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
  await dialog.getByRole('button', { name: 'Confirmar revisão' }).click();

  const semanticWrites = writes.filter(write => write.path === '/rest/v1/rpc/confirm_transaction_semantics');
  expect(semanticWrites).toHaveLength(2);
  expect(semanticWrites[0].body).toContain('dddddddd-2222-4ddd-8ddd-dddddddddddd');
  expect(semanticWrites[1].body).toContain('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
});

test('revisa novamente preservando versões e registra o outro lado da transferência própria', async ({ page }) => {
  const writes: { path: string; body: string | null }[] = [];
  await mockSupabase(page, true, writes);
  await login(page);
  await page.goto('/#review');

  await page.getByRole('tab', { name: /Histórico/ }).click();
  await page.getByRole('row', { name: /Bônus extraordinário/ }).getByRole('button', { name: 'Revisar novamente' }).click();
  let dialog = page.getByRole('dialog', { name: 'Revisar lançamento' });
  await expect(dialog.getByRole('region', { name: 'Versões anteriores' })).toContainText('Categoria: Salário');
  await dialog.getByRole('button', { name: 'Cancelar' }).click();

  await page.getByRole('tab', { name: /Pendências/ }).click();
  await page.getByRole('listitem').filter({ hasText: 'Café sintético' }).getByRole('button', { name: 'Alterar' }).click();
  dialog = page.getByRole('dialog', { name: 'Revisar lançamento' });
  await dialog.getByLabel('Natureza financeira').selectOption('own_transfer');
  const counterpart = dialog.getByLabel('Outro lado da transferência');
  await expect(counterpart.getByRole('option', { name: 'Registrar entrada em Cartão principal' })).toHaveCount(0);
  await expect(counterpart.getByRole('option', { name: /em Conta principal/ })).toHaveCount(0);
  await counterpart.selectOption({ label: 'Registrar entrada em Reserva' });
  await dialog.getByRole('button', { name: 'Confirmar revisão' }).click();
  await expect(page.getByText('Natureza e vínculo confirmados.')).toBeVisible();

  const semanticWrite = writes.find(write => write.path === '/rest/v1/rpc/confirm_transaction_semantics');
  expect(JSON.parse(semanticWrite!.body!)).toMatchObject({
    p_transaction_id: '99999999-3333-4999-8999-999999999999', p_effective_nature: 'own_transfer',
    p_counterpart_transaction_id: null, p_counterpart_account_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  });
});

test('navega por período na visão geral e mantém o mês na URL', async ({ page }) => {
  await mockSupabase(page);
  await login(page);
  const indicators = page.getByLabel('Indicadores do livro financeiro');
  const navigator = page.getByRole('group', { name: 'Período da visão geral' });
  await expect(navigator).toContainText('nov/2026');
  await expect(indicators.getByText('R$ 5.000,00', { exact: true })).toBeVisible();
  await navigator.getByRole('button', { name: 'Mês anterior' }).click();
  await expect(navigator).toContainText('out/2026');
  await expect(page).toHaveURL(/#overview\?period=2026-10$/);
  await expect(indicators.getByText('R$ 6.200,00', { exact: true })).toBeVisible();
  await expect(indicators.getByText('+ R$ 6.200,00', { exact: true })).toBeVisible();
  await navigator.getByRole('button', { name: 'Próximo mês' }).click();
  await expect(navigator).toContainText('nov/2026');
  await page.getByRole('link', { name: 'Ver lançamentos de nov/2026' }).click();
  await expect(page.getByLabel('Período', { exact: true })).toHaveValue('2026-11');
});

test('busca e filtra transações com estado na URL', async ({ page }) => {
  await mockSupabase(page);
  await login(page);
  await page.goto('/#transactions');
  const table = page.getByRole('table', { name: 'Livro financeiro' });
  await expect(table.getByRole('row').filter({ hasText: 'Receita mensal' })).toContainText('Manual');
  await expect(table).not.toContainText('Importado');
  await page.getByRole('searchbox', { name: 'Pesquisar descrição' }).fill('SALARIO');
  await expect(page.getByText('5 lançamentos encontrados')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Totais do período' })).toContainText('+ R$ 25.000,00');
  await expect(page.getByRole('main').getByLabel('Conta', { exact: true })).toBeHidden();
  await page.getByRole('button', { name: 'Filtros', exact: true }).click();
  await page.getByRole('main').getByLabel('Conta', { exact: true }).selectOption('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  // Botão de ícone com contador e etiqueta removível do filtro ativo (D-041).
  await expect(page.getByRole('button', { name: 'Filtros, 1 ativo' })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('list', { name: 'Filtros ativos' }).getByRole('button', { name: 'Remover filtro Conta: Conta principal' })).toBeVisible();
  await page.getByLabel('Período', { exact: true }).selectOption('2026-10');
  await expect(page.getByText('1 lançamento encontrado')).toBeVisible();
  await expect(page).toHaveURL(/q=SALARIO/);
  await expect(page).toHaveURL(/period=2026-10/);
  // O mock não restaura sessão em reload; sair e voltar pela mesma URL remonta a tela a partir dela.
  const filteredUrl = page.url();
  await page.goto('/#overview');
  await page.goto(filteredUrl);
  await expect(page.getByRole('searchbox', { name: 'Pesquisar descrição' })).toHaveValue('SALARIO');
  await expect(page.getByText('1 lançamento encontrado')).toBeVisible();

  const amount = table.getByRole('columnheader', { name: /Valor/ });
  await amount.getByRole('button').click();
  await expect(amount).toHaveAttribute('aria-sort', 'ascending');

  await page.getByRole('button', { name: 'Limpar filtros' }).first().click();
  await expect(page.getByRole('searchbox', { name: 'Pesquisar descrição' })).toHaveValue('');
  await expect(page).toHaveURL(/#transactions$/);
});

test('busca no histórico de revisão e ordena colunas sem ordenar ações', async ({ page }) => {
  await mockSupabase(page);
  await login(page);
  await page.goto('/#review?view=history&q=bonus');
  const table = page.getByRole('table', { name: 'Histórico de revisões' });
  await expect(table.getByRole('row', { name: /Bônus extraordinário/ })).toBeVisible();
  await expect(page.getByText('1 lançamento encontrado')).toBeVisible();
  await page.getByRole('searchbox', { name: 'Pesquisar descrição' }).fill('inexistente');
  await expect(page.getByText('Nenhum lançamento corresponde aos filtros')).toBeVisible();
  await page.getByRole('button', { name: 'Limpar filtros' }).click();
  await expect(table.getByRole('columnheader', { name: 'Data' })).toHaveAttribute('aria-sort', 'descending');
  await expect(table.getByRole('columnheader', { name: 'Ação', exact: true })).not.toHaveAttribute('aria-sort');
});

test('revisão pelo histórico confirma a categoria em todos os lançamentos iguais (D-060)', async ({ page }) => {
  const writes: { path: string; body: string | null }[] = [];
  // Dois cafés iguais (um em outra conta), além do pendente “Café sintético 1234” já existente no mock.
  const coffee = { account_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', category_id: 'restaurants', description: 'CAFÉ SINTÉTICO 5678', amount_cents: '-1200', nature: 'expense', reporting: 'expense', source: 'pluggy', competence: '2026-10' };
  await mockSupabase(page, true, writes, [
    { ...coffee, id: '30000000-3333-4000-8000-000000000001', event_date: '2026-10-20', classification_status: 'confirmed', external_key: 'pluggy-coffee-1' },
    { ...coffee, id: '30000000-3333-4000-8000-000000000002', event_date: '2026-10-10', classification_status: 'automatic', account_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', external_key: 'pluggy-coffee-2' }
  ]);
  await login(page);
  await page.goto('/#review?view=history&q=cafe');
  const table = page.getByRole('table', { name: 'Histórico de revisões' });
  await table.getByRole('row', { name: '20/10/2026' }).getByRole('button', { name: 'Revisar novamente' }).click();
  const dialog = page.getByRole('dialog', { name: 'Revisar lançamento' });
  await dialog.getByLabel('Categoria confirmada').selectOption('groceries');
  const scope = dialog.getByRole('group', { name: 'Aplicar a' });
  await expect(scope.getByLabel('Só este lançamento')).toBeChecked();
  await expect(dialog.getByRole('button', { name: 'Confirmar revisão' })).toBeVisible();
  await scope.getByLabel('Este e os iguais (2)').check();
  await expect(dialog.getByRole('region', { name: 'O que vai mudar' }).getByRole('listitem')).toHaveCount(3);
  await dialog.getByRole('button', { name: 'Confirmar em 3 lançamentos' }).click();
  await expect(page.getByText('Categoria confirmada em 3 lançamentos.')).toBeVisible();
  const bulk = writes.find(write => write.path === '/rest/v1/rpc/confirm_transaction_classifications');
  const body = JSON.parse(bulk?.body ?? '{}') as { p_transaction_ids: string[]; p_category_id: string };
  expect(body.p_category_id).toBe('groceries');
  expect([...body.p_transaction_ids].sort()).toEqual(['30000000-3333-4000-8000-000000000001', '30000000-3333-4000-8000-000000000002', '99999999-3333-4999-8999-999999999999']);
  expect(writes.some(write => write.path === '/rest/v1/rpc/confirm_transaction_classification')).toBe(false);
});

test('gráficos da visão geral seguem o período e os totais do livro', async ({ page }) => {
  await mockSupabase(page);
  await login(page);
  const flow = page.getByRole('figure', { name: 'Receitas e despesas por mês' });
  await expect(flow.getByRole('row', { name: /nov\/2026/ })).toContainText('R$ 5.000,00');
  await expect(flow.getByRole('row', { name: /out\/2026/ })).toContainText('R$ 6.200,00');
  const budgets = page.getByRole('list', { name: 'Orçado versus realizado por categoria' });
  await expect(budgets).toContainText('R$ 100,00 realizados de R$ 500,00 orçados');
  await expect(budgets).toContainText('Dentro do teto');
  await expect(page.getByRole('figure', { name: 'Compromissos de cartão por mês' }).getByRole('row', { name: /dez\/2026/ })).toContainText('Previsto');

  await page.getByRole('button', { name: 'Mês anterior' }).click();
  await expect(budgets).toContainText('R$ 0,00 realizados de R$ 500,00 orçados');
  await expect(flow.getByRole('row', { name: /out\/2026/ })).toContainText('R$ 6.200,00');
  await expect(flow.getByRole('row', { name: /nov\/2026/ })).toHaveCount(0);
});

// Inventário para o redesign: `pnpm redesign:inventory`. Dados do mock são fictícios.
test('inventário de telas para redesign', async ({ page }) => {
  test.skip(!process.env.REDESIGN_INVENTORY, 'Executado somente por pnpm redesign:inventory.');
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mockSupabase(page);
  await login(page);
  const screens = ['overview', 'transactions', 'accounts', 'cards', 'budgets', 'savings', 'categories', 'connections', 'review', 'review?view=history', 'reports'];
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    for (const [viewport, width] of [['desktop', 1440], ['mobile', 390]] as const) {
      await page.setViewportSize({ width, height: 900 });
      for (const screen of screens) {
        await page.goto(`/#${screen}`);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await page.screenshot({ path: `output/redesign-inventory/${viewport}-${colorScheme}-${screen.replace('?view=', '-')}.png`, fullPage: true });
      }
      await page.goto('/#review');
      await page.getByRole('listitem').filter({ hasText: 'Café sintético' }).getByRole('button', { name: 'Alterar' }).click();
      await page.screenshot({ path: `output/redesign-inventory/${viewport}-${colorScheme}-dialog-review.png` });
      await page.keyboard.press('Escape');
      if (viewport === 'mobile') {
        await page.getByRole('button', { name: 'Mais' }).click();
        await page.screenshot({ path: `output/redesign-inventory/${viewport}-${colorScheme}-sheet-more.png` });
        await page.keyboard.press('Escape');
      }
    }
  }
});

test('barra inferior mostra pendências e o menu da conta no cabeçalho troca o tema e sai', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockSupabase(page);
  await login(page);
  const navigation = page.getByRole('navigation', { name: 'Navegação principal' });
  await expect(navigation.getByRole('link', { name: 'Revisão 4 pendentes' })).toBeVisible();
  await navigation.getByRole('button', { name: 'Mais' }).click();
  await expect(page.getByRole('dialog', { name: 'Mais telas' }).getByRole('button', { name: 'Sair' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  const account = page.getByRole('button', { name: 'Menu da conta' });
  await account.click();
  const theme = page.getByRole('menuitemcheckbox', { name: 'Tema escuro' });
  await expect(theme).toBeFocused();
  const before = await theme.getAttribute('aria-checked');
  await theme.click();
  await expect(theme).toHaveAttribute('aria-checked', before === 'true' ? 'false' : 'true');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu', { name: 'Menu da conta' })).toHaveCount(0);
  await expect(account).toBeFocused();
  await account.click();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'Nome do titular' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'Sair' })).toBeFocused();
  await page.keyboard.press('Enter');
  await page.getByRole('dialog', { name: 'Sair da conta' }).getByRole('button', { name: 'Sair' }).click();
  await expect(page.getByRole('heading', { name: 'Entrar', level: 1 })).toBeVisible();
});

test('menu da conta abre inteiro acima da sidebar recolhida', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mockSupabase(page);
  await login(page);
  await page.getByRole('button', { name: 'Recolher menu' }).click();
  await page.getByRole('button', { name: 'Menu da conta' }).click();
  const menu = page.getByRole('menu', { name: 'Menu da conta' });
  await expectOnTop(menu, menu.getByRole('menuitemcheckbox', { name: 'Tema escuro' }));
  await expectOnTop(menu, menu.getByRole('menuitem', { name: 'Sair' }));
});

test('no mobile o título e a ação principal sobem para o cabeçalho do app', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockSupabase(page);
  await login(page);
  await page.goto('/#budgets');
  const bar = page.locator('.sidebar');
  await expect(bar.locator('.app-bar__title')).toHaveText('Orçamentos');
  await expect(page.getByRole('heading', { level: 1, name: 'Orçamentos' })).toBeAttached();
  // Uma só ação acessível: a do cabeçalho; a do título fica oculta.
  await expect(page.getByRole('button', { name: 'Definir meta' })).toHaveCount(1);
  await bar.getByRole('button', { name: 'Definir meta' }).click();
  await expect(page.getByRole('dialog', { name: 'Definir meta' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.goto('/#transactions');
  await expect(bar.locator('.app-bar__title')).toHaveText('Transações');
  await expect(bar.getByRole('button', { name: 'Definir meta' })).toHaveCount(0);
  const scan = await new AxeBuilder({ page }).include('.sidebar').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(scan.violations).toEqual([]);
});

test('tabelas viram lista compacta no mobile com ordenação e ações', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockSupabase(page);
  await login(page);
  await page.goto('/#transactions');
  await expect(page.getByRole('table', { name: 'Livro financeiro' })).toHaveCount(0);
  const list = page.getByRole('region', { name: 'Livro financeiro' });
  const items = list.getByRole('listitem');
  await expect(items.first()).toContainText('Pagamento da fatura');
  await list.getByLabel('Ordenar por').selectOption('amount:desc');
  await expect(items.first()).toContainText('R$ 5.000,00');
  const totalLines = await page.getByRole('region', { name: 'Totais do período' }).locator('strong').evaluateAll(values =>
    values.map(value => value.getBoundingClientRect().height < parseFloat(getComputedStyle(value).fontSize) * 2));
  expect(totalLines).toEqual([true, true, true]);
  expect(await list.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  const dimensions = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 1);

  await page.goto('/#review');
  const pending = page.getByRole('region', { name: 'Categorizar · 2' });
  await pending.getByRole('listitem').filter({ hasText: 'Café sintético' }).getByRole('button', { name: 'Alterar' }).click();
  await expect(page.getByRole('dialog', { name: 'Revisar lançamento' })).toBeVisible();
  await page.keyboard.press('Escape');
  const scan = await new AxeBuilder({ page }).include('.review-panel').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(scan.violations).toEqual([]);
});

test('itens por página das transações ficam salvos no navegador e a lista cabe em tela estreita', async ({ page }) => {
  await page.setViewportSize({ width: 300, height: 800 });
  await mockSupabase(page);
  await login(page);
  await page.goto('/#transactions');
  const pagination = page.getByRole('navigation', { name: 'Paginação' });
  await pagination.getByLabel('Por página').selectOption('20');
  await expect(pagination).toContainText('de');
  // Remonta a tela (o login simulado não sobrevive a reload): a escolha volta do localStorage.
  await page.goto('/#overview');
  await expect(page.getByRole('heading', { name: 'Visão geral', level: 1 })).toBeAttached();
  await page.goto('/#transactions');
  await expect(page.getByRole('navigation', { name: 'Paginação' }).getByLabel('Por página')).toHaveValue('20');
  expect(await page.evaluate(() => localStorage.getItem('pf-page-size:transactions'))).toBe('20');
  // Lista de cards não pode ficar mais larga que a tela (fonte ampliada no Android estreita a área útil).
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const overflow = await page.locator('.ui-table-list__item').evaluateAll(items => items.filter(item => item.scrollWidth > item.clientWidth + 1).length);
  expect(overflow).toBe(0);
});

test('ocultar valores mascara o app todo, fica salvo e não afeta o valor de edição', async ({ page }) => {
  await mockSupabase(page);
  await login(page);
  await page.goto('/#budgets');
  const summary = page.getByLabel('Resumo das metas por categoria');
  await expect(summary.getByText('+ R$ 5.000,00')).toBeVisible();
  const toggle = page.getByRole('button', { name: 'Ocultar valores' });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(summary).not.toContainText('5.000,00');
  await expect(summary.getByText('R$ •••••').first()).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('pf-hide-values'))).toBe('1');
  // O formulário de edição mostra o número real para editar.
  await page.getByRole('button', { name: 'Editar meta de Supermercado' }).click();
  await expect(page.getByRole('dialog', { name: 'Editar meta de Supermercado' }).getByLabel('Teto mensal')).toHaveValue('500,00');
  await page.keyboard.press('Escape');
  // Vale em outras telas e continua ao navegar.
  await page.goto('/#transactions');
  await expect(page.getByText('R$ •••••').first()).toBeVisible();
  await page.getByRole('button', { name: 'Ocultar valores' }).click();
  await expect(page.getByRole('button', { name: 'Ocultar valores' })).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => localStorage.getItem('pf-hide-values'))).toBe('0');
});

