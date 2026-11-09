import { useState } from "react";
import { brl, cents, today, totals, type Snapshot } from "../domain/finance";
import { Form } from "./Form";
import { rpc, save } from "../lib/api";
import type { DetailSnapshot } from "../domain/details";
export function CardDetails({
  data,
  refresh,
}: {
  data: Snapshot & DetailSnapshot;
  refresh: () => Promise<void>;
}) {
  const [message, setMessage] = useState("");
  const cards = data.financial_accounts
    .filter((a) => a.kind === "credit")
    .map((a) => [a.id, a.name] as [string, string]);
  const call = async (name: string, args: Record<string, unknown>) => {
    await rpc(name, args);
    await refresh();
  };
  return (
    <>
      <section>
        <h2>Faturas e conciliação</h2>
        <Form
          fields={[
            { name: "account_id", label: "Cartão da fatura", options: cards },
            {
              name: "competence",
              label: "Competência da fatura",
              type: "month",
              value: today().slice(0, 7),
            },
            { name: "due_date", label: "Vencimento", type: "date" },
            { name: "total", label: "Total informado na fatura (R$)" },
          ]}
          submit={async (v) => {
            await save("billing_statements", {
              workspace_id: data.workspace_id,
              account_id: v.account_id,
              competence: `${v.competence}-01`,
              due_date: v.due_date,
              declared_cents: cents(v.total).toString(),
            });
            await refresh();
          }}
        />
        {data.billing_statements?.map((s) => {
          const spent = totals(
            data.transactions.filter((t) => t.account_id === s.account_id),
            s.competence.slice(0, 7),
          ).consumption;
          const payments =
            data.billing_payments
              ?.filter((p) => p.statement_id === s.id)
              .map((p) =>
                data.transactions.find((t) => t.id === p.transaction_id),
              )
              .filter((t) => t?.status === "approved") ?? [];
          const paid = payments.reduce(
            (n, t) => n - BigInt(t!.amount_cents),
            0n,
          );
          return (
            <details key={s.id}>
              <summary>
                {
                  data.financial_accounts.find((a) => a.id === s.account_id)
                    ?.name
                }{" "}
                · {s.competence.slice(0, 7)} · {brl(s.declared_cents)} ·{" "}
                {paid >= BigInt(s.declared_cents)
                  ? "Paga"
                  : paid > 0n
                    ? "Parcial"
                    : "Em aberto"}
              </summary>
              <p>
                Vencimento {s.due_date} · Itens reconhecidos {brl(spent)} ·
                Diferença a conciliar {brl(BigInt(s.declared_cents) - spent)} ·
                Pago {brl(paid)}
              </p>
              <Form
                label="Registrar pagamento"
                fields={[
                  {
                    name: "source_account",
                    label: "Conta pagadora",
                    options: data.financial_accounts
                      .filter((a) => ["checking", "cash"].includes(a.kind))
                      .map((a) => [a.id, a.name]),
                  },
                  {
                    name: "payment_date",
                    label: "Data do pagamento",
                    type: "date",
                    value: today(),
                  },
                  { name: "amount", label: "Valor pago (R$)" },
                ]}
                submit={(v) =>
                  call("pay_statement", {
                    statement: s.id,
                    source_account: v.source_account,
                    payment_date: v.payment_date,
                    amount: cents(v.amount).toString(),
                    request_id: crypto.randomUUID(),
                  })
                }
              />
            </details>
          );
        })}
      </section>
      <section>
        <h2>Planejar parcelamento</h2>
        <p>
          O valor integral é apenas planejamento. Confirme cada ocorrência
          faturada ou vincule uma compra já importada; parcelas futuras não
          entram no consumo realizado.
        </p>
        <Form
          fields={[
            { name: "account_id", label: "Cartão da compra", options: cards },
            {
              name: "category_id",
              label: "Categoria da compra",
              required: false,
              options: data.categories.map((c) => [c.id, c.name]),
            },
            { name: "description", label: "Descrição da compra" },
            {
              name: "event_date",
              label: "Data da compra",
              type: "date",
              value: today(),
            },
            {
              name: "first_competence",
              label: "Primeira competência",
              type: "month",
              value: today().slice(0, 7),
            },
            { name: "total", label: "Valor integral (R$)" },
            {
              name: "installments",
              label: "Número de parcelas",
              type: "number",
              min: "2",
              max: "600",
            },
          ]}
          submit={(v) =>
            call("plan_installments", {
              p: {
                ...v,
                first_competence: `${v.first_competence}-01`,
                total_cents: cents(v.total).toString(),
                installments: Number(v.installments),
              },
            })
          }
        />
        {data.installment_purchases?.map((p) => (
          <details key={p.id}>
            <summary>
              {p.description} · {p.installments} parcelas · {brl(p.total_cents)}
            </summary>
            {data.installment_occurrences
              ?.filter((o) => o.purchase_id === p.id)
              .map((o) => (
                <article key={o.id}>
                  <strong>
                    {o.occurrence}/{p.installments} · {o.competence.slice(0, 7)}{" "}
                    · {brl(o.amount_cents)}
                  </strong>
                  {o.transaction_id ? (
                    <p>Vinculada ao livro financeiro.</p>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              "Confirmar que esta parcela foi efetivamente faturada?",
                            )
                          )
                            void call("confirm_installment", {
                              target: o.id,
                            }).catch(() =>
                              setMessage(
                                "Não foi possível confirmar a parcela.",
                              ),
                            );
                        }}
                      >
                        Confirmar ocorrência faturada
                      </button>
                      <Form
                        label="Vincular movimento existente"
                        fields={[
                          {
                            name: "existing",
                            label: "Compra importada",
                            options: data.transactions
                              .filter(
                                (t) =>
                                  t.account_id === p.account_id &&
                                  t.competence === o.competence &&
                                  t.amount_cents ===
                                    (-BigInt(o.amount_cents)).toString() &&
                                  t.nature === "expense" &&
                                  t.status === "approved",
                              )
                              .map((t) => [
                                t.id,
                                `${t.description} · ${t.event_date}`,
                              ]),
                          },
                        ]}
                        submit={(v) =>
                          call("confirm_installment", {
                            target: o.id,
                            existing: v.existing,
                          })
                        }
                      />
                    </>
                  )}
                </article>
              ))}
          </details>
        ))}
        <p role="status">{message}</p>
      </section>
    </>
  );
}
export function PayslipDetails({
  data,
  refresh,
}: {
  data: Snapshot & DetailSnapshot;
  refresh: () => Promise<void>;
}) {
  const payslips = data.payslips.map(
    (p) =>
      [p.id, `${p.employer} · ${p.competence.slice(0, 7)}`] as [string, string],
  );
  async function add(table: string, v: Record<string, unknown>) {
    await save(table, { ...v, workspace_id: data.workspace_id });
    await refresh();
  }
  return (
    <section>
      <h2>Rubricas e bases informativas</h2>
      <Form
        fields={[
          {
            name: "payslip_id",
            label: "Holerite da rubrica",
            options: payslips,
          },
          { name: "code", label: "Código da rubrica" },
          { name: "description", label: "Descrição da rubrica" },
          {
            name: "kind",
            label: "Tipo de rubrica",
            options: [
              ["earning", "Provento"],
              ["deduction", "Desconto (sem adiantamento)"],
              ["advance", "Adiantamento já recebido"],
            ],
          },
          { name: "amount", label: "Valor da rubrica (R$)" },
        ]}
        submit={(v) =>
          add("payslip_items", {
            payslip_id: v.payslip_id,
            code: v.code,
            description: v.description,
            kind: v.kind,
            amount_cents: cents(v.amount).toString(),
          })
        }
      />
      <Form
        fields={[
          { name: "payslip_id", label: "Holerite da base", options: payslips },
          { name: "name", label: "Nome da base (INSS, IRRF, FGTS)" },
          { name: "amount", label: "Valor da base (R$)" },
        ]}
        submit={(v) =>
          add("payslip_bases", {
            payslip_id: v.payslip_id,
            name: v.name,
            amount_cents: cents(v.amount).toString(),
          })
        }
      />
      {data.payslips.map((p) => {
        const items =
          data.payslip_items?.filter((i) => i.payslip_id === p.id) ?? [];
        const sum = (kind: string) =>
          items
            .filter((i) => i.kind === kind)
            .reduce((n, i) => n + BigInt(i.amount_cents), 0n);
        return (
          <details key={p.id}>
            <summary>
              {p.employer} · {p.competence.slice(0, 7)}
            </summary>
            <p>
              Diferença das rubricas para o cabeçalho: proventos{" "}
              {brl(BigInt(p.earnings_cents) - sum("earning"))}, descontos{" "}
              {brl(BigInt(p.deductions_cents) - sum("deduction"))}, adiantamento{" "}
              {brl(BigInt(p.advance_cents) - sum("advance"))}.
            </p>
            {items.map((i) => (
              <p key={i.id}>
                {i.code} · {i.description} · {brl(i.amount_cents)}
              </p>
            ))}
            {data.payslip_bases
              ?.filter((b) => b.payslip_id === p.id)
              .map((b) => (
                <p key={b.id}>
                  Base {b.name}: {brl(b.amount_cents)}
                </p>
              ))}
          </details>
        );
      })}
    </section>
  );
}
