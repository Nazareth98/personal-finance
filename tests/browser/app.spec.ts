import { test, expect, type Page } from "@playwright/test";
import type { Snapshot } from "../../src/domain/finance";
const workspace = "10000000-0000-4000-8000-000000000001",
  user = "20000000-0000-4000-8000-000000000002";
const empty: Snapshot = {
  version: 1,
  workspace_id: workspace,
  financial_accounts: [],
  categories: [],
  subcategories: [],
  categorization_rules: [],
  transactions: [],
  budget_allocations: [],
  savings_goals: [],
  payslips: [],
  import_batches: [],
  import_raw_rows: [],
  credit_cards: [],
  open_finance_connections: [],
};
async function mockApi(page: Page) {
  const data = structuredClone(empty);
  const requests: { path: string; body: unknown }[] = [];
  const jwt = [
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
      "base64url",
    ),
    Buffer.from(
      JSON.stringify({
        sub: user,
        role: "authenticated",
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString("base64url"),
    "synthetic-signature",
  ].join(".");
  const syntheticUser = {
    id: user,
    aud: "authenticated",
    role: "authenticated",
    email: "usuario@example.test",
    app_metadata: { provider: "email" },
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  };
  await page.route("http://127.0.0.1:54321/**", async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    const body = request.postDataJSON() as Record<string, unknown> | null;
    requests.push({ path, body });
    let response: unknown = {};
    if (path.endsWith("/token"))
      response = {
        access_token: jwt,
        refresh_token: "synthetic-refresh",
        expires_in: 3600,
        token_type: "bearer",
        user: syntheticUser,
      };
    else if (path.endsWith("/signup"))
      response = { user: syntheticUser, session: null };
    else if (path.endsWith("/user")) response = syntheticUser;
    else if (path.endsWith("/workspace_snapshot")) response = data;
    else if (
      path.endsWith("/financial_accounts") &&
      request.method() === "POST"
    ) {
      const value = body!;
      data.financial_accounts.push({
        id: crypto.randomUUID(),
        workspace_id: workspace,
        name: String(value.name),
        institution: String(value.institution),
        kind: "checking",
        opening_cents: String(value.opening_cents),
        archived: false,
      });
      response = null;
    } else if (path.endsWith("/stage_import")) response = "synthetic-batch";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });
  return { data, requests };
}
async function login(page: Page) {
  await page.goto("/");
  await page.getByLabel("E-mail", { exact: true }).fill("usuario@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha-sintetica-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
}
test("cadastro e recuperação apresentam mensagens e chamam Auth", async ({
  page,
}) => {
  const { requests } = await mockApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await page.getByLabel("E-mail", { exact: true }).fill("usuario@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha-sintetica-123");
  await page.getByRole("button", { name: "Cadastrar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Confira seu e-mail");
  expect(requests.some((r) => r.path.endsWith("/signup"))).toBe(true);
  await page.getByRole("button", { name: "Esqueci minha senha" }).click();
  await page.getByRole("button", { name: "Enviar instruções" }).click();
  await expect(page.getByRole("status")).toContainText("Se houver uma conta");
  expect(requests.some((r) => r.path.endsWith("/recover"))).toBe(true);
});
test("novo usuário vazio, gravação de conta, logout e layout móvel", async ({
  page,
}) => {
  await mockApi(page);
  await login(page);
  await expect(
    page.getByText("Seu espaço começa vazio.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Contas e cartões", exact: true })
    .click();
  await page
    .getByLabel("Nome da conta", { exact: true })
    .fill("Conta fictícia");
  await page.getByLabel("Instituição", { exact: true }).selectOption("Outra");
  await page.getByLabel("Tipo", { exact: true }).selectOption("checking");
  await page.getByLabel("Saldo inicial (R$)", { exact: true }).fill("100,00");
  await page
    .getByRole("button", { name: "Salvar", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Conta fictícia", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Sair da conta", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Entrar", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Conta fictícia", { exact: true })).toHaveCount(
    0,
  );
});
test("upload exige prévia e confirmação antes de persistir", async ({
  page,
}) => {
  const { data, requests } = await mockApi(page);
  data.financial_accounts.push({
    id: "30000000-0000-4000-8000-000000000003",
    workspace_id: workspace,
    name: "Conta sintética",
    institution: "Outra",
    kind: "checking",
    opening_cents: "0",
    archived: false,
  });
  await login(page);
  await page
    .getByRole("button", { name: "Importar e revisar", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Conta de destino", exact: true })
    .selectOption(data.financial_accounts[0].id);
  await page.getByLabel("Arquivo", { exact: true }).setInputFiles({
    name: "sintetico.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "data;descrição;valor\n09/01/2026;Loja fictícia;-10,50",
    ),
  });
  await expect(page.getByText("Prévia: 1 movimentos")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Enviar para revisão" }),
  ).toBeDisabled();
  expect(requests.some((r) => r.path.endsWith("/stage_import"))).toBe(false);
  await page.getByRole("checkbox").last().check();
  await page.getByRole("button", { name: "Enviar para revisão" }).click();
  await expect(page.getByRole("status").first()).toContainText("Lote enviado");
  expect(requests.some((r) => r.path.endsWith("/stage_import"))).toBe(true);
});
test("falha de autenticação não libera dados", async ({ page }) => {
  await page.route("http://127.0.0.1:54321/**", (r) =>
    r.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        error: "invalid_grant",
        error_description: "Invalid login credentials",
      }),
    }),
  );
  await page.goto("/");
  await page.getByLabel("E-mail", { exact: true }).fill("usuario@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("incorreta");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Não foi possível");
  await expect(page.getByRole("navigation")).toHaveCount(0);
});
