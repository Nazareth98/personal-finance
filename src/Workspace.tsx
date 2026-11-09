import { useCallback, useEffect, useState } from "react";
import {
  accountBalance,
  brl,
  budgetResult,
  cents,
  natureLabels,
  today,
  totals,
  type Snapshot,
} from "./domain/finance";
import { downloadJson, downloadText, rpc, save, snapshot } from "./lib/api";
import { ledgerCsv } from "./domain/reports";
import { supabase } from "./lib/supabase";
import { Form, type Field } from "./components/Form";
import { TransactionForm } from "./components/TransactionForm";
import { Imports } from "./components/Imports";
import { Restore } from "./components/Restore";
import { CardDetails, PayslipDetails } from "./components/FinancialDetails";
import { Classification } from "./components/Classification";
import { CategoryEditors, GoalEditor } from "./components/Editors";
import { Connections } from "./components/Connections";

const pages = [
  "Visão geral",
  "Lançamentos",
  "Contas e cartões",
  "Orçamentos",
  "Caixinhas",
  "Receitas e holerites",
  "Importar e revisar",
  "Conexões bancárias",
  "Categorias e regras",
  "Perfil e backup",
] as const;

type Page = (typeof pages)[number];
export function Workspace({ userId }: { userId: string }) {
  const [data, setData] = useState<Snapshot | null>(null),
    [page, setPage] = useState<Page>("Visão geral"),
    [error, setError] = useState(""),
    [period, setPeriod] = useState(today().slice(0, 7)),
    [annual, setAnnual] = useState(false),
    [search, setSearch] = useState("");
  const refresh = useCallback(async () => {
    setError("");
    try {
      setData(await snapshot());
    } catch {
      setError(
        "Não foi possível carregar seu espaço. Confira conexão e migrations.",
      );
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  async function mutate(
    table: string,
    v: Record<string, unknown>,
    id?: string,
  ) {
    await save(table, id ? v : { ...v, workspace_id: data!.workspace_id }, id);
    await refresh();
  }
  async function command(name: string, args: Record<string, unknown>) {
    await rpc(name, args);
    await refresh();
  }
  async function action(fn: () => Promise<unknown>) {
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operação não concluída.");
    }
  }
  if (!data)
    return (
      <main className="auth">
        <h1>Seu espaço pessoal</h1>
        <p role="status">{error || "Carregando…"}</p>
        <button onClick={() => void refresh()}>Tentar novamente</button>
        <button
          className="secondary"
          onClick={() => void supabase!.auth.signOut()}
        >
          Sair
        </button>
      </main>
    );
  const accounts = data.financial_accounts.map(
    (a) => [a.id, a.name] as [string, string],
  );
  const categories = data.categories
    .filter((c) => !c.archived)
    .map((c) => [c.id, c.name] as [string, string]);
  const periodKey = annual ? period.slice(0, 4) : period;
  const summary = totals(data.transactions, periodKey);
  const name = (id: string) =>
    data.financial_accounts.find((a) => a.id === id)?.name ?? "Conta";
  const category = (id: string | null) =>
    data.categories.find((c) => c.id === id)?.name ?? "Sem categoria";
  const accountField: Field = {
    name: "account_id",
    label: "Conta",
    options: accounts,
  };
  const categoryField: Field = {
    name: "category_id",
    label: "Categoria",
    options: categories,
  };
  return (
    <div className="app-shell">
      <aside>
        <a className="brand" href="#">
          ◒ Meu financeiro
        </a>
        <p className="workspace-label">ESPAÇO PESSOAL · PRIVADO</p>
        <nav aria-label="Menu principal">
          {pages.map((p) => (
            <button
              key={p}
              className={page === p ? "selected" : ""}
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          ))}
        </nav>
        <button
          className="logout"
          onClick={() =>
            void action(() =>
              supabase!.auth.signOut().then(({ error }) => {
                if (error) throw error;
              }),
            )
          }
        >
          Sair da conta
        </button>
      </aside>
      <main className="workspace">
        <header>
          <div>
            <span className="eyebrow">SEU DINHEIRO, COM CLAREZA</span>
            <h1>{page}</h1>
          </div>
          <div className="period">
            <label>
              Período
              <input
                aria-label="Período"
                type="month"
                value={period}
                onChange={(e) =>
                  setPeriod(e.target.value || today().slice(0, 7))
                }
              />
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={annual}
                onChange={(e) => setAnnual(e.target.checked)}
              />
              Visão anual
            </label>
          </div>
        </header>
        {error && (
          <p role="alert" className="notice">
            {error}
          </p>
        )}
        {page === "Visão geral" && (
          <>
            <p className="muted">
              Consumo por competência. Saldos por data bancária.
            </p>
            <div className="metrics">
              <Metric
                title="Renda confirmada"
                value={brl(summary.income)}
                detail={
                  summary.confirmed
                    ? "Créditos elegíveis registrados"
                    : "Renda ainda não confirmada"
                }
              />
              <Metric
                title="Consumo"
                value={brl(summary.consumption)}
                detail="Compras menos estornos"
              />
              <Metric
                title="Resultado do período"
                value={brl(summary.income - summary.consumption)}
                detail="Renda menos consumo"
              />
              <Metric
                title="Aportes"
                value={brl(summary.contributions)}
                detail="Movimentos para seus objetivos"
              />
            </div>
            <section>
              <h2>Disponível por categoria</h2>
              <Budgets data={data} period={periodKey} />
            </section>
            <section>
              <h2>Minhas contas</h2>
              {!accounts.length && (
                <p>
                  Comece cadastrando sua primeira conta. Seu espaço começa
                  vazio.
                </p>
              )}
              <div className="cards">
                {data.financial_accounts.map((a) => (
                  <article key={a.id}>
                    <small>
                      {a.institution} ·{" "}
                      {a.kind === "benefit"
                        ? "Benefício"
                        : a.kind === "credit"
                          ? "Cartão"
                          : "Conta"}
                    </small>
                    <h3>{a.name}</h3>
                    <strong>
                      {brl(accountBalance(a, data.transactions, today()))}
                    </strong>
                  </article>
                ))}
              </div>
            </section>
            <section>
              <h2>Próximos passos</h2>
              <div className="actions">
                <button onClick={() => setPage("Contas e cartões")}>
                  Cadastrar conta
                </button>
                <button
                  className="secondary"
                  onClick={() => setPage("Importar e revisar")}
                >
                  Importar arquivo
                </button>
              </div>
              <p>
                {
                  data.import_raw_rows.filter((r) => r.status === "pending")
                    .length
                }{" "}
                movimentos aguardando revisão.
              </p>
            </section>
          </>
        )}
        {page === "Contas e cartões" && (
          <>
            <section>
              <h2>Nova conta financeira</h2>
              <Form
                fields={[
                  { name: "name", label: "Nome da conta" },
                  {
                    name: "institution",
                    label: "Instituição",
                    options: [
                      ["Itaú", "Itaú"],
                      ["Nubank", "Nubank"],
                      ["Caixa", "Caixa"],
                      ["Outra", "Outra"],
                    ],
                  },
                  {
                    name: "kind",
                    label: "Tipo",
                    options: [
                      ["checking", "Conta corrente"],
                      ["cash", "Dinheiro"],
                      ["credit", "Cartão de crédito"],
                      ["benefit", "VR/VA"],
                      ["savings", "Caixinha/investimento"],
                      ["loan", "Passivo de empréstimo"],
                    ],
                  },
                  {
                    name: "opening",
                    label: "Saldo inicial (R$)",
                    value: "0",
                    help: "Saldo anterior ao primeiro movimento. Cartão com dívida: negativo.",
                  },
                ]}
                submit={(v) =>
                  mutate("financial_accounts", {
                    name: v.name,
                    institution: v.institution,
                    kind: v.kind,
                    opening_cents: cents(v.opening).toString(),
                  })
                }
              />
              <div className="cards">
                {data.financial_accounts.map((a) => (
                  <article key={a.id}>
                    <h3>{a.name}</h3>
                    <p>{a.institution}</p>
                    <strong>{brl(accountBalance(a, data.transactions))}</strong>
                    <button
                      className="secondary"
                      onClick={() =>
                        void action(() =>
                          mutate(
                            "financial_accounts",
                            { archived: !a.archived },
                            a.id,
                          ),
                        )
                      }
                    >
                      {a.archived ? "Reativar" : "Arquivar"}
                    </button>
                  </article>
                ))}
              </div>
            </section>
            <section>
              <h2>Configurar cartão</h2>
              <Form
                fields={[
                  {
                    ...accountField,
                    options: accounts.filter(
                      ([id]) =>
                        data.financial_accounts.find((a) => a.id === id)
                          ?.kind === "credit",
                    ),
                  },
                  {
                    name: "closing_day",
                    label: "Dia do fechamento",
                    type: "number",
                    min: "1",
                    max: "31",
                  },
                  {
                    name: "due_day",
                    label: "Dia do vencimento",
                    type: "number",
                    min: "1",
                    max: "31",
                  },
                  { name: "limit", label: "Limite (R$)" },
                  {
                    name: "last_four",
                    label: "Últimos quatro dígitos",
                    required: false,
                  },
                ]}
                submit={(v) =>
                  mutate("credit_cards", {
                    account_id: v.account_id,
                    closing_day: Number(v.closing_day),
                    due_day: Number(v.due_day),
                    limit_cents: cents(v.limit).toString(),
                    last_four: v.last_four || null,
                  })
                }
              />
              {data.credit_cards.map((c) => (
                <article key={c.id}>
                  <h3>
                    {name(c.account_id)}{" "}
                    {c.last_four ? `•••• ${c.last_four}` : ""}
                  </h3>
                  <p>
                    Fecha dia {c.closing_day} · vence dia {c.due_day} · limite{" "}
                    {brl(c.limit_cents)}
                  </p>
                  <p>
                    Compras na competência:{" "}
                    {brl(
                      totals(
                        data.transactions.filter(
                          (t) => t.account_id === c.account_id,
                        ),
                        periodKey,
                      ).consumption,
                    )}
                  </p>
                </article>
              ))}
            </section>
          </>
        )}
        {page === "Contas e cartões" && (
          <CardDetails data={data} refresh={refresh} />
        )}
        {page === "Lançamentos" && (
          <>
            <section>
              <h2>Registrar movimento</h2>
              <TransactionForm
                data={data}
                submit={(p) => command("record_transaction", { p })}
              />
            </section>
            <section>
              <h2>Livro financeiro</h2>
              <button
                className="secondary"
                onClick={() =>
                  downloadText(
                    ledgerCsv(
                      data.transactions.filter((t) =>
                        t.competence.startsWith(periodKey),
                      ),
                    ),
                    `lancamentos-${periodKey}.csv`,
                  )
                }
              >
                Exportar período em CSV
              </button>
              <label>
                Buscar descrição
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Data / competência</th>
                      <th>Descrição</th>
                      <th>Conta</th>
                      <th>Natureza</th>
                      <th>Categoria</th>
                      <th>Valor</th>
                      <th>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transactions
                      .filter(
                        (t) =>
                          t.competence.startsWith(periodKey) &&
                          t.description
                            .toLocaleLowerCase("pt-BR")
                            .includes(search.toLocaleLowerCase("pt-BR")),
                      )
                      .map((t) => (
                        <tr key={t.id}>
                          <td>
                            {t.event_date}
                            <small>{t.competence.slice(0, 7)}</small>
                          </td>
                          <td>
                            {t.description}
                            <small>
                              {t.status === "void" ? "Anulado" : t.source}
                            </small>
                          </td>
                          <td>{name(t.account_id)}</td>
                          <td>{natureLabels[t.nature]}</td>
                          <td>
                            {category(t.category_id)}
                            {t.status === "approved" && (
                              <Classification
                                data={data}
                                transaction={t}
                                refresh={refresh}
                              />
                            )}
                          </td>
                          <td className="money">{brl(t.amount_cents)}</td>
                          <td>
                            {t.status === "approved" && (
                              <button
                                className="secondary"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      "Anular este movimento e, se houver, seu par patrimonial? O histórico será preservado.",
                                    )
                                  )
                                    void action(() =>
                                      command("void_transaction", {
                                        target: t.id,
                                      }),
                                    );
                                }}
                              >
                                Anular
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
        {page === "Orçamentos" && (
          <>
            <section>
              <h2>Definir meta</h2>
              <Form
                fields={[
                  categoryField,
                  {
                    name: "period",
                    label: "Primeiro dia do período",
                    type: "date",
                    value: `${period}-01`,
                  },
                  {
                    name: "cadence",
                    label: "Periodicidade",
                    options: [
                      ["monthly", "Mensal"],
                      ["annual", "Anual (início em janeiro)"],
                    ],
                  },
                  { name: "fixed", label: "Limite fixo (R$)", required: false },
                  {
                    name: "percent",
                    label: "Ou percentual da renda (%)",
                    required: false,
                  },
                  {
                    name: "forecast",
                    label: "Renda prevista (R$), opcional",
                    required: false,
                    help: "Vazio usa somente renda confirmada.",
                  },
                ]}
                submit={(v) =>
                  mutate(
                    "budget_allocations",
                    {
                      category_id: v.category_id,
                      period: v.period,
                      cadence: v.cadence,
                      fixed_cents: v.fixed ? cents(v.fixed).toString() : null,
                      percentage_bps: v.percent
                        ? Number(cents(v.percent))
                        : null,
                      forecast_income_cents: v.forecast
                        ? cents(v.forecast).toString()
                        : null,
                    },
                    data.budget_allocations.find(
                      (b) =>
                        b.category_id === v.category_id &&
                        b.period === v.period &&
                        b.cadence === v.cadence,
                    )?.id,
                  )
                }
              />
            </section>
            <section>
              <Budgets data={data} period={periodKey} />
            </section>
          </>
        )}
        {page === "Caixinhas" && (
          <>
            <section>
              <h2>Novo objetivo</h2>
              <Form
                fields={[
                  { name: "name", label: "Nome do objetivo" },
                  {
                    ...accountField,
                    options: accounts.filter(
                      ([id]) =>
                        data.financial_accounts.find((a) => a.id === id)
                          ?.kind === "savings",
                    ),
                  },
                  { name: "target", label: "Meta (R$)" },
                  {
                    name: "deadline",
                    label: "Prazo",
                    type: "date",
                    required: false,
                  },
                ]}
                submit={(v) =>
                  mutate("savings_goals", {
                    name: v.name,
                    account_id: v.account_id,
                    target_cents: cents(v.target).toString(),
                    deadline: v.deadline || null,
                  })
                }
              />
              <p>
                Cadastre uma conta do tipo caixinha. Registre aportes e resgates
                em Lançamentos, selecionando origem e destino.
              </p>
            </section>
            <div className="cards">
              {data.savings_goals.map((g) => {
                const a = data.financial_accounts.find(
                  (a) => a.id === g.account_id,
                )!;
                const balance = accountBalance(a, data.transactions);
                return (
                  <article key={g.id}>
                    <h2>{g.name}</h2>
                    <strong>{brl(balance)}</strong>
                    <p>
                      Meta {brl(g.target_cents)} · {g.deadline ?? "Sem prazo"}
                    </p>
                    <progress
                      aria-label={`Progresso ${g.name}`}
                      value={Number(balance > 0n ? balance : 0n)}
                      max={Number(g.target_cents)}
                    />
                    <p>
                      Faltam{" "}
                      {brl(
                        BigInt(g.target_cents) > balance
                          ? BigInt(g.target_cents) - balance
                          : 0n,
                      )}
                    </p>
                  </article>
                );
              })}
            </div>
          </>
        )}
        {page === "Caixinhas" && <GoalEditor data={data} refresh={refresh} />}
        {page === "Receitas e holerites" && (
          <>
            <section>
              <h2>Conferir holerite</h2>
              <p>
                O holerite documenta a composição; vincule adiantamento e
                líquido às receitas em Lançamentos. VR/VA deve entrar em conta
                de benefício.
              </p>
              <Form
                fields={[
                  { name: "employer", label: "Identificação do vínculo" },
                  {
                    name: "competence",
                    label: "Competência (primeiro dia)",
                    type: "date",
                    value: `${period}-01`,
                  },
                  { name: "earnings", label: "Proventos (R$)" },
                  {
                    name: "deductions",
                    label: "Descontos, sem adiantamento (R$)",
                  },
                  { name: "advance", label: "Adiantamento já recebido (R$)" },
                  { name: "net", label: "Líquido final (R$)" },
                ]}
                submit={(v) =>
                  mutate("payslips", {
                    employer: v.employer,
                    competence: v.competence,
                    earnings_cents: cents(v.earnings).toString(),
                    deductions_cents: cents(v.deductions).toString(),
                    advance_cents: cents(v.advance).toString(),
                    net_cents: cents(v.net).toString(),
                  })
                }
              />
              {data.payslips.map((p) => {
                const linked = data.transactions
                  .filter(
                    (t) => t.payslip_id === p.id && t.status === "approved",
                  )
                  .reduce((s, t) => s + BigInt(t.amount_cents), 0n);
                return (
                  <article key={p.id}>
                    <h3>
                      {p.employer} · {p.competence.slice(0, 7)}
                    </h3>
                    <p>
                      Adiantamento {brl(p.advance_cents)} + líquido{" "}
                      {brl(p.net_cents)}
                    </p>
                    <p>
                      Créditos vinculados {brl(linked)} · diferença a conciliar{" "}
                      {brl(
                        BigInt(p.advance_cents) + BigInt(p.net_cents) - linked,
                      )}
                    </p>
                  </article>
                );
              })}
            </section>
          </>
        )}
        {page === "Receitas e holerites" && (
          <PayslipDetails data={data} refresh={refresh} />
        )}
        {page === "Importar e revisar" && (
          <Imports data={data} refresh={refresh} />
        )}
        {page === "Conexões bancárias" && (
          <Connections data={data} refresh={refresh} />
        )}
        {page === "Categorias e regras" && (
          <>
            <section>
              <h2>Nova categoria</h2>
              <Form
                fields={[{ name: "name", label: "Nome" }]}
                submit={(v) => mutate("categories", v)}
              />
              <div className="chips">
                {data.categories.map((c) => (
                  <span key={c.id}>{c.name}</span>
                ))}
              </div>
            </section>
            <section>
              <h2>Nova subcategoria</h2>
              <Form
                fields={[
                  categoryField,
                  { name: "name", label: "Nome da subcategoria" },
                ]}
                submit={(v) => mutate("subcategories", v)}
              />
            </section>
            <section>
              <h2>Regra de sugestão</h2>
              <p>
                Correspondência literal, sem regex. Prioridade menor vence.
                Regras nunca alteram natureza financeira ou decisões já
                aprovadas.
              </p>
              <Form
                fields={[
                  { name: "keyword", label: "Texto que a descrição contém" },
                  categoryField,
                  {
                    name: "priority",
                    label: "Prioridade",
                    type: "number",
                    value: "100",
                  },
                ]}
                submit={(v) =>
                  mutate("categorization_rules", {
                    ...v,
                    priority: Number(v.priority),
                  })
                }
              />
              {data.categorization_rules.map((r) => (
                <article key={r.id}>
                  <strong>{r.keyword}</strong>
                  <p>
                    {category(r.category_id)} · prioridade {r.priority}
                  </p>
                  <button
                    className="secondary"
                    onClick={() =>
                      void action(() =>
                        mutate(
                          "categorization_rules",
                          { active: !r.active },
                          r.id,
                        ),
                      )
                    }
                  >
                    {r.active ? "Desativar" : "Ativar"}
                  </button>
                </article>
              ))}
            </section>
          </>
        )}
        {page === "Categorias e regras" && (
          <CategoryEditors data={data} refresh={refresh} />
        )}
        {page === "Perfil e backup" && (
          <>
            <section>
              <h2>Meu perfil</h2>
              <Form
                key={data.profile?.display_name}
                fields={[
                  {
                    name: "display_name",
                    label: "Nome de exibição",
                    value: data.profile?.display_name ?? "",
                  },
                ]}
                submit={async (v) => {
                  await save("profiles", v, userId);
                  await refresh();
                }}
              />
              <p>Moeda BRL · Português brasileiro · America/Sao_Paulo</p>
            </section>
            <section>
              <h2>Backup privado</h2>
              <p>
                Exporta somente seu workspace. Guarde o arquivo em local
                protegido; ele contém seu histórico financeiro.
              </p>
              <button
                onClick={() =>
                  void action(async () =>
                    downloadJson(
                      await snapshot(),
                      `financeiro-${today()}.json`,
                    ),
                  )
                }
              >
                Exportar JSON completo
              </button>
            </section>
            <Restore refresh={refresh} />
            <section>
              <h2>Solicitar exclusão da conta</h2>
              <p>
                A solicitação preserva o histórico até confirmação da identidade
                e do procedimento de exclusão. Exporte seus dados antes.
              </p>
              <button
                className="secondary"
                onClick={() => {
                  if (
                    window.confirm(
                      "Registrar solicitação de exclusão? O histórico não será apagado neste momento.",
                    )
                  )
                    void action(async () => {
                      await save(
                        "profiles",
                        { deletion_requested_at: new Date().toISOString() },
                        userId,
                      );
                      setError(
                        "Solicitação registrada. A exclusão exige acompanhamento do operador do projeto.",
                      );
                    });
                }}
              >
                Registrar solicitação
              </button>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
function Metric({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="metric">
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}
function Budgets({ data, period }: { data: Snapshot; period: string }) {
  const rows = data.budget_allocations.filter((b) =>
    period.length === 4
      ? b.cadence === "annual" && b.period.startsWith(period)
      : b.cadence === "monthly" && b.period.startsWith(period),
  );
  return rows.length ? (
    <div className="cards">
      {rows.map((b) => {
        const r = budgetResult(b, data.transactions);
        return (
          <article key={b.id}>
            <h3>{data.categories.find((c) => c.id === b.category_id)?.name}</h3>
            <small>
              {r.forecast ? "Base: renda prevista" : "Base: renda confirmada"} ·{" "}
              {b.cadence === "annual" ? "Anual" : "Mensal"}
            </small>
            <strong>
              {r.available === null
                ? "Renda ainda não confirmada"
                : `${brl(r.available)} disponíveis`}
            </strong>
            <p>
              Consumo {brl(r.consumption)} · limite{" "}
              {r.limit === null ? "A confirmar" : brl(r.limit)}
            </p>
            {r.limit !== null && r.limit > 0n && (
              <progress
                aria-label="Orçamento utilizado"
                max={Number(r.limit)}
                value={Number(r.consumption > 0n ? r.consumption : 0n)}
              />
            )}
            <small>Excedente {brl(r.excess ?? 0n)}</small>
          </article>
        );
      })}
    </div>
  ) : (
    <p>Nenhuma meta cadastrada para este período.</p>
  );
}
