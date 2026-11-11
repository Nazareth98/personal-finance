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
  meupluggy_connections: [],
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
    else if (path.endsWith("/process_imports"))
      response = {
        approved: 0,
        linked: 0,
        pending: data.import_raw_rows.filter((row) => row.status === "pending").length,
      };
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
  await page.getByRole("textbox", { name: "E-mail", exact: true }).fill("usuario@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha-sintetica-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
}
async function navigate(page: Page, name: string) {
  const menu = page.getByRole("button", { name: "Abrir navegação", exact: true });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("button", { name, exact: true }).click();
}
test("ajudas da jornada prioritária explicam pré-requisitos sem apagar o formulário", async ({ page }) => {
  await mockApi(page);
  await login(page);
  const sections: [string, string[]][] = [
    ["Contas e cartões", ["Contas financeiras", "Cartões de crédito", "Faturas e conciliação", "Planejar parcelamento"]],
    ["Categorias e regras", ["Nova categoria", "Nova subcategoria", "Regra de classificação e automação", "Importar categorias e regras privadas", "Editar cadastros"]],
    ["Meu Pluggy", ["Meu Pluggy"]],
    ["Importar e revisar", ["Importar arquivo", "Revisar antes de contabilizar", "Histórico de lotes"]],
    ["Lançamentos", ["Registrar movimento", "Livro financeiro"]],
  ];
  for (const [pageName, titles] of sections) {
    await navigate(page, pageName);
    for (const title of titles) {
      const trigger = page.getByRole("button", { name: `Ajuda sobre ${title}`, exact: true });
      await expect(trigger).toBeVisible();
      await trigger.click();
      const dialog = page.getByRole("dialog", { name: `Ajuda: ${title}`, exact: true });
      await expect(dialog).toBeVisible();
      if (title === "Revisar antes de contabilizar") {
        await expect(dialog).toContainText("conta observada");
        await expect(dialog).toContainText("conta de contrapartida");
        await dialog.evaluate(element => { element.scrollTop = element.scrollHeight; });
        await expect(dialog.getByRole("button", { name: "Fechar ajuda" })).toBeInViewport();
      }
      if (title === "Meu Pluggy") await expect(dialog).toContainText("somente ao titular autorizado");
      await dialog.getByRole("button", { name: "Fechar ajuda" }).click();
      await expect(trigger).toBeFocused();
    }
    if (pageName === "Contas e cartões") {
      const field = page.getByRole("textbox", { name: "Nome da conta", exact: true });
      await field.fill("Conta de exemplo");
      await page.getByRole("button", { name: "Ajuda sobre Contas financeiras" }).click();
      await page.getByRole("button", { name: "Fechar ajuda" }).click();
      await expect(field).toHaveValue("Conta de exemplo");
    }
  }
});

test("ajudas das demais áreas completam o inventário sem executar ações", async ({ page }) => {
  const { data, requests } = await mockApi(page);
  const savingsAccount = "30000000-0000-4000-8000-000000000030";
  data.financial_accounts.push({ id: savingsAccount, workspace_id: workspace, name: "Reserva fictícia", institution: "Outra", kind: "savings", opening_cents: "1000", archived: false });
  data.savings_goals.push({ id: "40000000-0000-4000-8000-000000000040", workspace_id: workspace, name: "Objetivo fictício", account_id: savingsAccount, target_cents: "10000", deadline: null });
  data.payslips.push({ id: "50000000-0000-4000-8000-000000000050", workspace_id: workspace, employer: "Vínculo fictício", competence: "2026-01-01", earnings_cents: "100000", deductions_cents: "10000", advance_cents: "20000", net_cents: "70000" });
  await page.goto("/");
  const accessHelp = page.getByRole("button", { name: "Ajuda sobre acesso à conta", exact: true });
  await accessHelp.click();
  await expect(page.getByRole("dialog", { name: "Ajuda: acesso à conta", exact: true })).toContainText("pelo menos 12 caracteres");
  await page.getByRole("button", { name: "Fechar ajuda" }).click();
  await login(page);

  const areas: [string, string[]][] = [
    ["Visão geral", ["navegação e período", "indicadores da visão geral", "Minhas contas", "Próximos passos"]],
    ["Orçamentos", ["Definir meta", "Metas do período"]],
    ["Caixinhas", ["Novo objetivo", "Seus objetivos", "Editar objetivo"]],
    ["Receitas e holerites", ["Conferir holerite", "Rubricas e bases informativas"]],
    ["Perfil e backup", ["Meu perfil", "Backup privado", "Restaurar backup", "Solicitar exclusão da conta"]],
  ];
  for (const [pageName, titles] of areas) {
    if (pageName !== "Visão geral") await navigate(page, pageName);
    for (const title of titles) {
      const trigger = page.getByRole("button", { name: `Ajuda sobre ${title}`, exact: true });
      await expect(trigger).toBeVisible();
      await trigger.click();
      const dialog = page.getByRole("dialog", { name: `Ajuda: ${title}`, exact: true });
      await expect(dialog).toBeVisible();
      if (title === "indicadores da visão geral") await expect(dialog).toContainText("não são tratados como despesa nem como renda");
      if (title === "Conferir holerite") await expect(dialog).toContainText("não cria receita");
      if (title === "Restaurar backup") await expect(dialog).toContainText("somente registros ausentes são adicionados");
      await dialog.getByRole("button", { name: "Fechar ajuda" }).click();
    }
    if (pageName === "Caixinhas") await expect(page.getByRole("button", { name: "Ajuda sobre objetivo Objetivo fictício" })).toBeVisible();
    if (pageName === "Receitas e holerites") await expect(page.getByRole("button", { name: "Ajuda sobre holerite Vínculo fictício" })).toBeVisible();
  }
  expect(requests.some(({ path }) => path.endsWith("/restore_backup") || path.endsWith("/profiles"))).toBe(false);
});

test("fila pendente mostra motivo, conta, direção e duplicidade anterior", async ({ page }) => {
  const { data } = await mockApi(page);
  const account = "30000000-0000-4000-8000-000000000003";
  const batch = "40000000-0000-4000-8000-000000000004";
  data.financial_accounts.push({ id: account, workspace_id: workspace, name: "Conta sintética", institution: "Outra", kind: "checking", opening_cents: "0", archived: false });
  data.import_batches.push({ id: batch, workspace_id: workspace, account_id: account, file_hash: "sintetico", parser_version: "csv" });
  for (const [index, description] of ["Primeira compra fictícia", "Segunda compra fictícia"].entries()) {
    data.import_raw_rows.push({ id: `row-${index}`, workspace_id: workspace, batch_id: batch, row_index: index, status: "pending", transaction_id: null, proposal: { description, amount_cents: "-1000", event_date: "2026-01-09", bank_date: "2026-01-09", competence: "2026-01-01", nature: "expense" } });
  }
  await login(page);
  await navigate(page, "Importar e revisar");
  const first = page.getByText("Primeira compra fictícia", { exact: true });
  await expect(first).toBeVisible();
  await expect(page.getByText("Sem regra de automação", { exact: true })).toBeVisible();
  await expect(page.getByText("Conta sintética", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Saída", { exact: true }).first()).toBeVisible();
  await first.click();
  await page.getByRole("button", { name: "Ajuda sobre revisar movimento" }).click();
  await expect(page.getByRole("dialog", { name: "Ajuda: revisar movimento" })).toContainText("conta observada");
  await page.getByRole("button", { name: "Fechar ajuda" }).click();
  await page.getByRole("combobox", { name: "Motivo da pendência" }).selectOption("possible_duplicate");
  await expect(page.getByText("Primeira compra fictícia", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Segunda compra fictícia", { exact: true })).toBeVisible();
  await expect(page.getByText("Possível duplicidade", { exact: true })).toBeVisible();
});
test("ajuda contextual abre por teclado, mantém o foco e fecha sem alterar dados", async ({ page }) => {
  const { requests } = await mockApi(page);
  await login(page);
  const trigger = page.getByRole("button", { name: "Ajuda sobre Disponível por categoria" });
  const dialog = page.getByRole("dialog", { name: "Ajuda: Disponível por categoria" });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(dialog).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  const close = dialog.getByRole("button", { name: "Fechar ajuda" });
  await expect(close).toBeFocused();
  await expect(dialog.getByText(/crie uma meta na aba Orçamentos/)).toBeVisible();
  await page.evaluate(() => document.querySelector<HTMLButtonElement>(".logout")?.focus());
  await expect(close).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  await close.click();
  await expect(trigger).toBeFocused();
  expect(requests.some(({ path }) => path.endsWith("/review_import") || path.endsWith("/stage_import"))).toBe(false);
});
test("cadastro e recuperação apresentam mensagens e chamam Auth", async ({
  page,
}) => {
  const { requests } = await mockApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await page.getByRole("textbox", { name: "E-mail", exact: true }).fill("usuario@example.test");
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
  await navigate(page, "Contas e cartões");
  await page
    .getByRole("textbox", { name: "Nome da conta", exact: true })
    .fill("Conta fictícia");
  await page.getByRole("combobox", { name: "Instituição", exact: true }).selectOption("Outra");
  await page.getByRole("combobox", { name: "Tipo", exact: true }).selectOption("checking");
  await page.getByRole("textbox", { name: /^Saldo inicial \(R\$\)/ }).fill("100,00");
  await page
    .getByRole("button", { name: "Salvar", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Conta fictícia", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ajuda sobre conta Conta fictícia" }).click();
  await expect(page.getByRole("dialog", { name: "Ajuda: conta Conta fictícia" })).toContainText("Arquivar preserva o histórico");
  await page.getByRole("button", { name: "Fechar ajuda" }).click();
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
  await navigate(page, "Importar e revisar");
  await page
    .getByRole("combobox", { name: "Conta observada no extrato", exact: true })
    .selectOption(data.financial_accounts[0].id);
  await page.getByLabel(/^Arquivo\b/).setInputFiles({
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
  await expect(page.getByRole("status").first()).toContainText("Lote processado");
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
  await page.getByRole("textbox", { name: "E-mail", exact: true }).fill("usuario@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("incorreta");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Não foi possível");
  await expect(page.getByRole("navigation")).toHaveCount(0);
});

test("menu compacto persiste, tema mantém saída legível e navegação funciona no celular", async ({ page }) => {
  await mockApi(page);
  await page.emulateMedia({ colorScheme: "light" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page);
  await page.getByRole("button", { name: "Minimizar menu lateral" }).press("Enter");
  const expand = page.getByRole("button", { name: "Expandir menu lateral" });
  await expect(expand).toHaveAttribute("aria-expanded", "false");
  expect((await page.getByRole("complementary").boundingBox())!.width).toBe(80);
  await navigate(page, "Lançamentos");
  await expect(page.getByRole("heading", { name: "Registrar movimento" })).toBeVisible();
  await page.getByRole("button", { name: "Usar tema escuro" }).press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const logout = page.getByRole("button", { name: "Sair da conta" });
  await expect(logout).toBeVisible();
  const contrast = await logout.evaluate(button => {
    const luminance = (color: string) => {
      const rgb = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(value => {
        const srgb = value / 255;
        return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
      });
      return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
    };
    const foreground = luminance(getComputedStyle(button).color);
    const background = luminance(getComputedStyle(button.closest("aside")!).backgroundColor);
    return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
  await page.reload();
  await expect(expand).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.setViewportSize({ width: 320, height: 900 });
  await expect(expand).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const openMenu = page.getByRole("button", { name: "Abrir navegação" });
  await openMenu.click();
  await expect(page.getByRole("button", { name: "Contas e cartões", exact: true }).locator("span")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(openMenu).toBeFocused();
  await navigate(page, "Contas e cartões");
  await expect(page.getByRole("heading", { name: "Contas financeiras" })).toBeVisible();
  await expect(openMenu).toHaveAttribute("aria-expanded", "false");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(logout).toBeVisible();
  await page.getByRole("button", { name: "Usar tema claro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.setViewportSize({ width: 1440, height: 1000 });
  await expand.click();
  expect((await page.getByRole("complementary").boundingBox())!.width).toBe(240);
  await logout.click();
  await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeVisible();
});
