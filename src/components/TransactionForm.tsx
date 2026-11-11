import { useState, type FormEvent } from "react";
import {
  cents,
  natureLabels,
  today,
  type Nature,
  type Snapshot,
  type Proposal,
} from "../domain/finance";
export function TransactionForm({
  data,
  submit,
  initial,
  accountId,
  label = "Registrar",
  className = "",
  children,
}: {
  data: Snapshot;
  submit: (p: Record<string, unknown>) => Promise<void>;
  initial?: Proposal;
  accountId?: string;
  label?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const [category, setCategory] = useState(initial?.category_id ?? ""),
    [subcategory, setSubcategory] = useState(() =>
      data.subcategories.some(
        (item) =>
          item.id === initial?.subcategory_id &&
          item.category_id === initial?.category_id,
      )
        ? (initial?.subcategory_id ?? "")
        : "",
    ),
    [nature, setNature] = useState<Nature>(initial?.nature ?? "expense"),
    [direction, setDirection] = useState<"debit" | "credit">(
      initial && BigInt(initial.amount_cents) > 0n ? "credit" : "debit",
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const paired = [
    "transfer",
    "contribution",
    "redemption",
    "card_payment",
  ].includes(nature);
  const observedAccount = accountId
    ? data.financial_accounts.find((account) => account.id === accountId)
    : undefined;
  const counterpartLabel =
    nature === "loan"
      ? "Conta de passivo do empréstimo"
      : nature === "redemption"
        ? direction === "credit"
          ? "Conta de investimento de origem"
          : "Conta de caixa de destino"
        : nature === "contribution"
          ? direction === "debit"
            ? "Conta de investimento de destino"
            : "Conta de caixa de origem"
          : nature === "card_payment"
            ? direction === "debit"
              ? "Cartão de destino"
              : "Conta de caixa de origem"
            : "Conta de contrapartida";
  function counterpartAllowed(kind: Snapshot["financial_accounts"][number]["kind"]): boolean {
    if (!accountId || !initial) return true;
    if (nature === "contribution")
      return direction === "debit" ? kind === "savings" : ["checking", "cash"].includes(kind);
    if (nature === "redemption")
      return direction === "credit" ? kind === "savings" : ["checking", "cash"].includes(kind);
    if (nature === "card_payment")
      return direction === "debit" ? kind === "credit" : ["checking", "cash"].includes(kind);
    if (nature === "loan") return kind === "loan";
    return true;
  }
  async function handle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = e.currentTarget;
    const v = Object.fromEntries(new FormData(form).entries()) as Record<
      string,
      string
    >;
    try {
      const amount = cents(v.amount);
      if (amount <= 0n)
        throw new Error(
          "Informe um valor positivo; a natureza define a direção.",
        );
      await submit({
        account_id: accountId || v.account_id,
        description: v.description,
        amount_cents: (accountId && initial
          ? direction === "debit"
            ? -amount
            : amount
          : nature === "expense" || paired
            ? -amount
            : amount
        ).toString(),
        nature,
        event_date: v.event_date,
        bank_date: v.bank_date,
        competence: `${v.competence}-01`,
        category_id: category || null,
        subcategory_id: v.subcategory_id || null,
        counterpart_account_id: v.counterpart_account_id || null,
        related_id: v.related_id || null,
        payslip_id: v.payslip_id || null,
        source_key: crypto.randomUUID(),
        installment_index: v.installment_index
          ? Number(v.installment_index)
          : null,
        installment_count: v.installment_count
          ? Number(v.installment_count)
          : null,
      });
      if (!initial) form.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível registrar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={handle} className={`entry-form ${className}`.trim()} aria-busy={busy}>
      <p className="form-required-note">Campos com * são obrigatórios.</p>
      {observedAccount && (
        <div className="import-observed-account">
          <span>Conta observada no extrato</span>
          <strong>{observedAccount.name}</strong>
          <small>{observedAccount.institution}</small>
        </div>
      )}
      <div className="form-grid">
        <label>
          <span>Descrição<span className="required-marker" aria-hidden="true"> *</span></span>
          <input
            name="description"
            defaultValue={initial?.description}
            maxLength={500}
            required
          />
        </label>
        {accountId && initial && (
          <label>
            <span>Movimento na conta observada<span className="required-marker" aria-hidden="true"> *</span></span>
            <select
              value={direction}
              onChange={(event) => setDirection(event.target.value as "debit" | "credit")}
            >
              <option value="debit">Saída da conta</option>
              <option value="credit">Entrada na conta</option>
            </select>
            <small>Altere somente se o arquivo trouxe a direção incorreta.</small>
          </label>
        )}
        <label>
          <span>Valor absoluto (R$)<span className="required-marker" aria-hidden="true"> *</span></span>
          <input
            name="amount"
            inputMode="decimal"
            defaultValue={
              initial
                ? (
                    (BigInt(initial.amount_cents) < 0n
                      ? -BigInt(initial.amount_cents)
                      : BigInt(initial.amount_cents)) / 100n
                  ).toString() +
                  "," +
                  String(
                    (BigInt(initial.amount_cents) < 0n
                      ? -BigInt(initial.amount_cents)
                      : BigInt(initial.amount_cents)) % 100n,
                  ).padStart(2, "0")
                : undefined
            }
            required
          />
        </label>
        <label>
          <span>Natureza<span className="required-marker" aria-hidden="true"> *</span></span>
          <select
            value={nature}
            onChange={(e) => setNature(e.target.value as Nature)}
          >
            {Object.entries(natureLabels).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        {!accountId && (
          <label>
            <span>Conta do lançamento<span className="required-marker" aria-hidden="true"> *</span></span>
            <select name="account_id" required>
              <option value="">Selecione</option>
              {data.financial_accounts
                .filter((a) => !a.archived)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </label>
        )}
        {(paired || nature === "loan") && (
          <label>
            <span>{counterpartLabel}<span className="required-marker" aria-hidden="true"> *</span></span>
            <select
              name="counterpart_account_id"
              required
              defaultValue={initial?.counterpart_account_id ?? ""}
            >
              <option value="">Selecione</option>
              {data.financial_accounts
                .filter(
                  (a) =>
                    !a.archived &&
                    a.id !== accountId &&
                    counterpartAllowed(a.kind),
                )
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </label>
        )}
        <label>
          <span>Data do evento<span className="required-marker" aria-hidden="true"> *</span></span>
          <input
            name="event_date"
            type="date"
            required
            defaultValue={initial?.event_date ?? today()}
          />
        </label>
        <label>
          <span>Data bancária<span className="required-marker" aria-hidden="true"> *</span></span>
          <input
            name="bank_date"
            type="date"
            required
            defaultValue={initial?.bank_date ?? today()}
          />
        </label>
        <label>
          <span>Competência<span className="required-marker" aria-hidden="true"> *</span></span>
          <input
            name="competence"
            type="month"
            required
            defaultValue={
              initial?.competence.slice(0, 7) ?? today().slice(0, 7)
            }
          />
        </label>
        <label>
          Categoria
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setSubcategory("");
            }}
          >
            <option value="">Sem categoria</option>
            {data.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Subcategoria
          <select
            name="subcategory_id"
            value={subcategory}
            onChange={(e) => setSubcategory(e.target.value)}
            disabled={
              !category ||
              !data.subcategories.some((s) => s.category_id === category)
            }
          >
            <option value="">Sem subcategoria</option>
            {data.subcategories
              .filter((s) => s.category_id === category)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </label>
        {nature === "refund" && (
          <label>
              <span>Compra estornada<span className="required-marker" aria-hidden="true"> *</span></span>
            <select name="related_id" required>
              <option value="">Selecione</option>
              {data.transactions
                .filter(
                  (t) => t.nature === "expense" && t.status === "approved",
                )
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.description} · {t.event_date}
                  </option>
                ))}
            </select>
          </label>
        )}
        {nature === "income" && (
          <label>
            Holerite vinculado
            <select name="payslip_id">
              <option value="">Sem vínculo</option>
              {data.payslips.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.employer} · {p.competence}
                </option>
              ))}
            </select>
          </label>
        )}
        {nature === "expense" && (
          <>
            <label>
              Parcela atual (opcional)
              <input
                name="installment_index"
                type="number"
                min="1"
                max="600"
                defaultValue={initial?.installment_index}
              />
            </label>
            <label>
              Total de parcelas (opcional)
              <input
                name="installment_count"
                type="number"
                min="1"
                max="600"
                defaultValue={initial?.installment_count}
              />
            </label>
          </>
        )}
      </div>
      {children}
      <button disabled={busy}>{busy ? "Salvando…" : label}</button>
      {error && <p role="alert" className="form-error">{error}</p>}
    </form>
  );
}
