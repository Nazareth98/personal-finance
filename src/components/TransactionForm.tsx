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
  children,
}: {
  data: Snapshot;
  submit: (p: Record<string, unknown>) => Promise<void>;
  initial?: Proposal;
  accountId?: string;
  label?: string;
  children?: React.ReactNode;
}) {
  const [category, setCategory] = useState(initial?.category_id ?? ""),
    [nature, setNature] = useState<Nature>(initial?.nature ?? "expense"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const paired = [
    "transfer",
    "contribution",
    "redemption",
    "card_payment",
  ].includes(nature);
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
        amount_cents: (nature === "expense" || paired
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
    <form onSubmit={handle} className="entry-form">
      <div className="form-grid">
        <label>
          Descrição
          <input
            name="description"
            defaultValue={initial?.description}
            maxLength={500}
            required
          />
        </label>
        <label>
          Valor absoluto (R$)
          <input
            name="amount"
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
          Natureza
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
            Conta de origem
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
            {nature === "loan"
              ? "Conta de passivo do empréstimo"
              : "Conta de destino"}
            <select name="counterpart_account_id" required>
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
        <label>
          Data do evento
          <input
            name="event_date"
            type="date"
            required
            defaultValue={initial?.event_date ?? today()}
          />
        </label>
        <label>
          Data bancária
          <input
            name="bank_date"
            type="date"
            required
            defaultValue={initial?.bank_date ?? today()}
          />
        </label>
        <label>
          Competência
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
            onChange={(e) => setCategory(e.target.value)}
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
            key={category}
            defaultValue={initial?.subcategory_id ?? ""}
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
            Compra estornada
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
      <p role="status">{error}</p>
    </form>
  );
}
