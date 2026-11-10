import { describe, expect, test } from "vitest";
import {
  accountBalance,
  brl,
  budgetResult,
  cents,
  dateSchema,
  duplicateCandidates,
  reconcilePayslip,
  suggest,
  totals,
  type Transaction,
  type Budget,
  type Rule,
} from "../src/domain/finance";
import { parsePrivateConfiguration } from "../src/domain/private-configuration";
const tx = (
  nature: Transaction["nature"],
  amount: string,
  extra: Partial<Transaction> = {},
): Transaction => ({
  id: crypto.randomUUID(),
  workspace_id: "a",
  account_id: "account",
  description: "Loja fictícia",
  amount_cents: amount,
  nature,
  event_date: "2026-01-29",
  bank_date: "2026-01-30",
  competence: "2026-02-01",
  status: "approved",
  source: "manual",
  source_key: "test",
  category_id: "food",
  subcategory_id: null,
  related_id: null,
  payslip_id: null,
  ...extra,
});
describe("centavos e datas", () => {
  test("parsing e representação exatos", () => {
    expect(cents("1.234,56")).toBe(123456n);
    expect(cents("-0,01")).toBe(-1n);
    expect(brl(12345678901234567n)).toBe("R$ 123.456.789.012.345,67");
    expect(() => cents("1,001")).toThrow();
  });
  test("valida calendário", () => {
    expect(dateSchema.safeParse("2026-02-30").success).toBe(false);
    expect(dateSchema.safeParse("2024-02-29").success).toBe(true);
  });
});
test("pagamento, aporte, empréstimo, benefício e resgate não duplicam consumo/renda", () => {
  const rows = [
    tx("expense", "-10000"),
    tx("card_payment", "-10000"),
    tx("card_payment", "10000"),
    tx("transfer", "-50000"),
    tx("transfer", "50000"),
    tx("contribution", "-20000"),
    tx("contribution", "20000"),
    tx("redemption", "10000"),
    tx("benefit", "30000"),
    tx("loan", "100000"),
  ];
  expect(totals(rows, "2026-02")).toMatchObject({
    income: 0n,
    consumption: 10000n,
    contributions: 20000n,
  });
  expect(totals(rows, "2026-01").consumption).toBe(0n);
});
test("saldo usa data bancária e inclui movimentos patrimoniais", () => {
  expect(
    accountBalance(
      {
        id: "account",
        workspace_id: "a",
        name: "a",
        institution: "Outra",
        kind: "checking",
        opening_cents: "10000",
        archived: false,
      },
      [tx("transfer", "-5000")],
      "2026-01-30",
    ),
  ).toBe(5000n);
});
const budget: Budget = {
  id: "b",
  workspace_id: "a",
  category_id: "food",
  period: "2026-02-01",
  cadence: "monthly",
  fixed_cents: null,
  percentage_bps: 1500,
  forecast_income_cents: null,
};
test("metas, excesso, falta de confirmação e arredondamento", () => {
  expect(budgetResult(budget, []).limit).toBe(null);
  expect(
    budgetResult(budget, [tx("income", "500000"), tx("expense", "-53000")])
      .available,
  ).toBe(22000n);
  expect(
    budgetResult(budget, [tx("income", "500000"), tx("expense", "-81000")]),
  ).toMatchObject({ available: 0n, excess: 6000n });
  expect(
    budgetResult({ ...budget, percentage_bps: 5000 }, [tx("income", "1")])
      .limit,
  ).toBe(1n);
});
test("anual não inventa 12 salários; estorno e anulação", () => {
  expect(
    budgetResult({ ...budget, cadence: "annual", period: "2026-01-01" }, [
      tx("income", "500000"),
      tx("expense", "-53000"),
      tx("refund", "10000"),
      tx("expense", "-10000", { status: "void" }),
    ]),
  ).toMatchObject({ limit: 75000n, consumption: 43000n });
});
test("holerite não produz receita adicional", () => {
  expect(
    reconcilePayslip({
      earnings_cents: "600000",
      deductions_cents: "100000",
      advance_cents: "200000",
      net_cents: "300000",
    }),
  ).toBe(0n);
  expect(
    totals([tx("income", "200000"), tx("income", "300000")], "2026").income,
  ).toBe(500000n);
});
test("parcelas reconhecidas na competência individual", () => {
  expect(
    totals(
      [
        tx("expense", "-10000", {
          installment_index: 3,
          installment_count: 10,
        }),
        tx("expense", "-10000", {
          competence: "2026-03-01",
          installment_index: 4,
          installment_count: 10,
        }),
      ],
      "2026-02",
    ).consumption,
  ).toBe(10000n);
});
test("regras literais, acentos e prioridade", () => {
  const base: Rule = {
    id: "1",
    workspace_id: "a",
    keyword: "CAFÉ *",
    priority: 1,
    category_id: "food",
    subcategory_id: null,
    active: true,
    match_mode: "contains_literal",
    requires_financial_nature_review: false,
    source_key: null,
  };
  expect(suggest("cafe * fictício", [base])?.id).toBe("1");
  expect(suggest("cafe qualquer", [base])).toBeUndefined();
});
test("fingerprint sugere, não funde duas compras iguais", () => {
  const t = tx("expense", "-10000");
  expect(
    duplicateCandidates(t, "account", [t, { ...t, id: "second" }]),
  ).toHaveLength(2);
});
test("descrições diferentes entre origens continuam candidatas, sem juntar compras", () => {
  const t = tx("expense", "-10000");
  const other = {
    ...t,
    id: "provider",
    description: "Descrição enviada pelo provedor",
  };
  expect(
    duplicateCandidates(t, "account", [other, t]).map((row) => row.id),
  ).toEqual([t.id, other.id]);
  expect(duplicateCandidates(t, "outra-conta", [other])).toHaveLength(0);
});

test("importação privada valida referências e contagens sem dados pessoais", () => {
  const categories = JSON.stringify({ items: [
    { order: 1, category: "Categoria sintética", subcategory: "Sub sintética", nature: "expense" },
  ] });
  const rules = JSON.stringify({ items: [
    { priority: 2, keyword: "termo sintético", category: "Categoria sintética", subcategory: "Sub sintética", matchMode: "contains_literal", isActive: true, requiresFinancialNatureReview: true },
  ] });
  const result = parsePrivateConfiguration(categories, rules);
  expect(result.categoryCount).toBe(1);
  expect(result.subcategoryCount).toBe(1);
  expect(result.rulesRequiringNatureReview).toBe(1);
  expect(() => parsePrivateConfiguration(categories, rules.replace("Categoria sintética", "Categoria ausente"))).toThrow();
  expect(() => parsePrivateConfiguration(categories, rules.replace("contains_literal", "regex"))).toThrow();
});

test("natureza pode variar entre subcategorias, mas não dentro do mesmo par", () => {
  const categories = JSON.stringify({ items: [
    { order: 1, category: "Categoria sintética", subcategory: "Sub A", nature: "expense" },
    { order: 2, category: "Categoria sintética", subcategory: "Sub B", nature: "income" },
  ] });
  const rules = JSON.stringify({ items: [
    { priority: 1, keyword: "termo", category: "Categoria sintética", subcategory: "Sub A", matchMode: "contains_literal", isActive: true, requiresFinancialNatureReview: false },
  ] });
  expect(parsePrivateConfiguration(categories, rules).subcategoryCount).toBe(2);
  const conflict = categories.replace('"subcategory":"Sub B","nature":"income"', '"subcategory":"Sub A","nature":"income"');
  expect(() => parsePrivateConfiguration(conflict, rules)).toThrow(/subcategoria/i);
});
