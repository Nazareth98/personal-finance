import { z } from "zod";
import type { DetailSnapshot } from "./details";
export const natureLabels = {
  expense: "Consumo",
  income: "Receita elegível",
  transfer: "Transferência própria",
  contribution: "Aporte",
  redemption: "Resgate",
  card_payment: "Pagamento de fatura",
  benefit: "Crédito VR/VA",
  loan: "Empréstimo",
  refund: "Estorno",
} as const;
export type Nature = keyof typeof natureLabels;
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(`${v}T12:00:00Z`).toISOString().slice(0, 10) === v,
    "Data inválida",
  );
export const proposalSchema = z.object({
  description: z.string().min(1).max(500),
  amount_cents: z
    .string()
    .regex(/^-?\d+$/)
    .refine(
      (v) =>
        BigInt(v) !== 0n &&
        BigInt(v) >= -9000000000000n &&
        BigInt(v) <= 9000000000000n,
    ),
  event_date: dateSchema,
  bank_date: dateSchema,
  competence: dateSchema.refine((v) => v.endsWith("-01")),
  nature: z.enum([
    "expense",
    "income",
    "transfer",
    "contribution",
    "redemption",
    "card_payment",
    "benefit",
    "loan",
    "refund",
  ]),
  external_key: z.string().optional(),
  category_id: z.string().optional(),
  subcategory_id: z.string().optional(),
  counterpart_account_id: z.string().optional(),
  installment_index: z.number().int().positive().optional(),
  installment_count: z.number().int().positive().optional(),
  original_row: z.record(z.string(), z.string()).optional(),
  original_text: z.string().max(10000).optional(),
});
export type Proposal = z.infer<typeof proposalSchema>;
export interface Entity {
  id: string;
  workspace_id: string;
}
export interface Account extends Entity {
  name: string;
  institution: string;
  kind: "checking" | "cash" | "credit" | "benefit" | "savings" | "loan";
  opening_cents: string;
  archived: boolean;
}
export interface Category extends Entity {
  name: string;
  archived: boolean;
  budget_nature: string | null;
  sort_order: number;
}
export interface Subcategory extends Entity {
  name: string;
  category_id: string;
  sort_order: number;
  budget_nature: string | null;
}
export interface Rule extends Entity {
  keyword: string;
  priority: number;
  category_id: string;
  subcategory_id: string | null;
  active: boolean;
  match_mode: "contains_literal";
  requires_financial_nature_review: boolean;
  source_key: string | null;
  account_id?: string | null;
  amount_direction?: "any" | "debit" | "credit";
  transaction_nature?: Nature | null;
  counterpart_account_id?: string | null;
  auto_approve?: boolean;
}
export interface Transaction
  extends Entity, Omit<Proposal, "category_id" | "subcategory_id"> {
  account_id: string;
  category_id: string | null;
  subcategory_id: string | null;
  status: "approved" | "void";
  source: string;
  source_key: string;
  related_id: string | null;
  payslip_id: string | null;
}
export interface Budget extends Entity {
  category_id: string;
  period: string;
  cadence: "monthly" | "annual";
  fixed_cents: string | null;
  percentage_bps: number | null;
  forecast_income_cents: string | null;
}
export interface Goal extends Entity {
  name: string;
  account_id: string;
  target_cents: string;
  deadline: string | null;
}
export interface Payslip extends Entity {
  competence: string;
  employer: string;
  earnings_cents: string;
  deductions_cents: string;
  advance_cents: string;
  net_cents: string;
}
export interface RawRow extends Entity {
  batch_id: string;
  row_index: number;
  proposal: Proposal;
  status: string;
  transaction_id: string | null;
  review_reason?: ReviewReason | null;
  automation_rule_id?: string | null;
}
export interface Batch extends Entity {
  account_id: string;
  file_hash: string;
  parser_version: string;
  created_at?: string;
}
export interface Card extends Entity {
  account_id: string;
  closing_day: number;
  due_day: number;
  limit_cents: string;
  last_four: string | null;
}
export interface Connection extends Entity {
  account_id: string;
  provider_code: "meupluggy";
  institution: string;
  status: string;
  expires_at: string | null;
  last_sync_at: string | null;
  cursor: number;
  scopes: string[];
  pluggy_item_id?: string | null;
  pluggy_account_id?: string | null;
}
export interface Snapshot extends DetailSnapshot {
  version: 1;
  workspace_id: string;
  financial_accounts: Account[];
  categories: Category[];
  subcategories: Subcategory[];
  categorization_rules: Rule[];
  transactions: Transaction[];
  budget_allocations: Budget[];
  savings_goals: Goal[];
  payslips: Payslip[];
  import_batches: Batch[];
  import_raw_rows: RawRow[];
  credit_cards: Card[];
  meupluggy_connections?: Connection[];
}

export const reviewReasonLabels = {
  no_automation_rule: "Sem regra de automação",
  automation_disabled: "Aprovação automática desativada",
  nature_review_required: "Natureza financeira exige revisão",
  missing_category: "Categoria não preenchida",
  missing_subcategory: "Subcategoria não preenchida",
  missing_counterpart: "Conta de contrapartida não preenchida",
  possible_duplicate: "Possível duplicidade",
  unsupported_automatic_nature: "Tipo exige decisão manual",
} as const;
export type ReviewReason = keyof typeof reviewReasonLabels;

export interface ImportProcessingResult {
  approved: number;
  linked: number;
  pending: number;
}

export function cents(input: string): bigint {
  let v = input
    .trim()
    .replace(/R\$\s*/, "")
    .replace(/\s/g, "");
  if (v.includes(",")) v = v.replace(/\./g, "").replace(",", ".");
  if (!/^-?\d+(\.\d{1,2})?$/.test(v))
    throw new Error("Valor inválido. Use até duas casas decimais.");
  const negative = v.startsWith("-");
  const [whole, fraction = ""] = v.replace("-", "").split(".");
  const result =
    (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"))) *
    (negative ? -1n : 1n);
  if (result > 9000000000000n || result < -9000000000000n)
    throw new Error("Valor acima do limite por lançamento.");
  return result;
}
export function brl(value: bigint | string): string {
  const n = BigInt(value),
    abs = n < 0n ? -n : n;
  return `${n < 0n ? "-" : ""}R$ ${(abs / 100n).toLocaleString("pt-BR")},${String(abs % 100n).padStart(2, "0")}`;
}
export function today(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function normalize(v: string): string {
  return v
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}
export function suggest(
  description: string,
  rules: Rule[],
  context?: { accountId?: string; amountCents?: string },
): Rule | undefined {
  const amount = context?.amountCents ? BigInt(context.amountCents) : null;
  return [...rules]
    .filter(
      (r) =>
        r.active &&
        r.match_mode === "contains_literal" &&
        (!r.account_id || !context?.accountId || r.account_id === context.accountId) &&
        ((r.amount_direction ?? "any") === "any" ||
          amount === null ||
          (r.amount_direction === "debit" && amount < 0n) ||
          (r.amount_direction === "credit" && amount > 0n)) &&
        normalize(description).includes(normalize(r.keyword)),
    )
    .sort(
      (a, b) =>
        a.priority - b.priority ||
        b.keyword.length - a.keyword.length ||
        a.id.localeCompare(b.id),
    )[0];
}

export function pendingDuplicateCandidates(
  row: RawRow,
  batch: Batch,
  rows: RawRow[],
  batches: Batch[],
): RawRow[] {
  return rows.filter((candidate) => {
    if (candidate.id === row.id || candidate.status === "ignored") return false;
    const candidateBatch = batches.find((item) => item.id === candidate.batch_id);
    if (!candidateBatch || candidateBatch.account_id !== batch.account_id) return false;
    const comesFirst =
      candidate.batch_id === row.batch_id
        ? candidate.row_index < row.row_index
        : `${candidateBatch.created_at ?? ""}:${candidateBatch.id}` <
          `${batch.created_at ?? ""}:${batch.id}`;
    return (
      comesFirst &&
      BigInt(candidate.proposal.amount_cents) === BigInt(row.proposal.amount_cents) &&
      candidate.proposal.event_date === row.proposal.event_date
    );
  });
}
export function totals(
  transactions: Transaction[],
  period: string,
  category?: string,
) {
  const rows = transactions.filter(
    (t) => t.status === "approved" && t.competence.startsWith(period),
  );
  const income = rows
    .filter((t) => t.nature === "income")
    .reduce((s, t) => s + BigInt(t.amount_cents), 0n);
  const consumption = rows
    .filter(
      (t) =>
        (!category || t.category_id === category) &&
        ["expense", "refund"].includes(t.nature),
    )
    .reduce((s, t) => s - BigInt(t.amount_cents), 0n);
  const contributions = rows
    .filter((t) => t.nature === "contribution" && BigInt(t.amount_cents) < 0n)
    .reduce((s, t) => s - BigInt(t.amount_cents), 0n);
  return {
    income,
    consumption,
    contributions,
    confirmed: rows.some((t) => t.nature === "income"),
  };
}
export function budgetResult(b: Budget, transactions: Transaction[]) {
  const period =
    b.cadence === "annual" ? b.period.slice(0, 4) : b.period.slice(0, 7);
  const actual = totals(transactions, period, b.category_id);
  const base =
    b.forecast_income_cents !== null
      ? BigInt(b.forecast_income_cents)
      : actual.confirmed
        ? actual.income
        : null;
  const limit =
    b.fixed_cents !== null
      ? BigInt(b.fixed_cents)
      : base === null
        ? null
        : (base * BigInt(b.percentage_bps!) + 5000n) / 10000n;
  return {
    ...actual,
    limit,
    available:
      limit === null
        ? null
        : limit > actual.consumption
          ? limit - actual.consumption
          : 0n,
    excess:
      limit === null
        ? null
        : actual.consumption > limit
          ? actual.consumption - limit
          : 0n,
    forecast: b.forecast_income_cents !== null,
  };
}
export function accountBalance(
  a: Account,
  transactions: Transaction[],
  date?: string,
): bigint {
  return (
    BigInt(a.opening_cents) +
    transactions
      .filter(
        (t) =>
          t.account_id === a.id &&
          t.status === "approved" &&
          (!date || t.bank_date <= date),
      )
      .reduce((s, t) => s + BigInt(t.amount_cents), 0n)
  );
}
export function duplicateCandidates(
  p: Pick<Proposal, "amount_cents" | "event_date" | "description">,
  account: string,
  transactions: Transaction[],
): Transaction[] {
  return transactions
    .filter(
      (t) =>
        t.account_id === account &&
        t.status === "approved" &&
        BigInt(t.amount_cents) === BigInt(p.amount_cents) &&
        t.event_date === p.event_date,
    )
    .sort(
      (a, b) =>
        Number(normalize(b.description) === normalize(p.description)) -
        Number(normalize(a.description) === normalize(p.description)),
    );
}
export function reconcilePayslip(p: {
  earnings_cents: string;
  deductions_cents: string;
  advance_cents: string;
  net_cents: string;
}): bigint {
  return (
    BigInt(p.earnings_cents) -
    BigInt(p.deductions_cents) -
    BigInt(p.advance_cents) -
    BigInt(p.net_cents)
  );
}
