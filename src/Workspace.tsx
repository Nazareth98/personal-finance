import { useCallback, useEffect, useRef, useState } from "react";
import {
  Banknote,
  CircleDollarSign,
  ChartPie,
  CreditCard,
  Download,
  FileText,
  Landmark,
  LayoutDashboard,
  Link2,
  ListChecks,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  PiggyBank,
  Receipt,
  Settings2,
  Search,
  ShoppingBag,
  Sun,
  Tags,
  type LucideIcon,
  WalletCards,
  X,
} from "lucide-react";
import {
  accountBalance,
  brl,
  budgetResult,
  cents,
  natureLabels,
  today,
  totals,
  type Account,
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
import { CategorySubcategoryFields } from "./components/CategorySubcategoryFields";
import { PrivateConfigurationImport } from "./components/PrivateConfigurationImport";
import { SectionTitle } from "./components/SectionTitle";
import { MoneyValue } from "./components/MoneyValue";
import { ContextHelp } from "./components/ContextHelp";

const pages = [
  "Visão geral",
  "Lançamentos",
  "Contas e cartões",
  "Orçamentos",
  "Caixinhas",
  "Receitas e holerites",
  "Importar e revisar",
  "Meu Pluggy",
  "Categorias e regras",
  "Perfil e backup",
] as const;

type Page = (typeof pages)[number];
type Theme = "light" | "dark";
const pageIcons: Record<Page, LucideIcon> = {
  [pages[0]]: LayoutDashboard,
  [pages[1]]: Receipt,
  [pages[2]]: Landmark,
  [pages[3]]: ChartPie,
  [pages[4]]: PiggyBank,
  [pages[5]]: FileText,
  [pages[6]]: ListChecks,
  [pages[7]]: Link2,
  [pages[8]]: Tags,
  [pages[9]]: Settings2,
};
const accountKindLabels: Record<Account["kind"], string> = {
  checking: "Conta corrente",
  cash: "Dinheiro",
  credit: "Cartão de crédito",
  benefit: "VR/VA",
  savings: "Caixinha/investimento",
  loan: "Empréstimo",
};
const accountKindIcons: Record<Account["kind"], LucideIcon> = {
  checking: Landmark,
  cash: Banknote,
  credit: CreditCard,
  benefit: WalletCards,
  savings: PiggyBank,
  loan: CircleDollarSign,
};
const displayDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
const displayMonth = (value: string) => {
  const [year, month] = value.slice(0, 7).split("-");
  return `${month}/${year}`;
};
function initialTheme(): Theme {
  try {
    const stored = localStorage.getItem("personal-finance-theme");
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    // Use a preferência do sistema quando o armazenamento local está bloqueado.
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}
export function Workspace({ userId }: { userId: string }) {
  const [data, setData] = useState<Snapshot | null>(null),
    [page, setPage] = useState<Page>("Visão geral"),
    [error, setError] = useState(""),
    [period, setPeriod] = useState(today().slice(0, 7)),
    [annual, setAnnual] = useState(false),
    [theme, setTheme] = useState<Theme>(initialTheme),
    [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
      try {
        return localStorage.getItem("personal-finance-sidebar-collapsed") === "true";
      } catch {
        return false;
      }
    }),
    [mobileNavOpen, setMobileNavOpen] = useState(false),
    [search, setSearch] = useState("");
  const mobileNavButton = useRef<HTMLButtonElement>(null);
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
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("personal-finance-theme", theme);
    } catch {
      // A preferência segue ativa nesta sessão.
    }
  }, [theme]);
  useEffect(() => {
    try {
      localStorage.setItem("personal-finance-sidebar-collapsed", String(sidebarCollapsed));
    } catch {
      // O menu continua funcionando quando o armazenamento está bloqueado.
    }
  }, [sidebarCollapsed]);
  useEffect(() => {
    if (!mobileNavOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
        if (window.matchMedia("(max-width: 1199px)").matches) {
          mobileNavButton.current?.focus();
        }
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [mobileNavOpen]);
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
  const creditAccounts = data.financial_accounts
    .filter((account) => !account.archived && account.kind === "credit")
    .map((account) => [account.id, account.name] as [string, string]);
  const categories = data.categories
    .filter((c) => !c.archived)
    .map((c) => [c.id, c.name] as [string, string]);
  const periodKey = annual ? period.slice(0, 4) : period;
  const ledgerRows = data.transactions.filter(
    (transaction) =>
      transaction.competence.startsWith(periodKey) &&
      transaction.description
        .toLocaleLowerCase("pt-BR")
        .includes(search.trim().toLocaleLowerCase("pt-BR")),
  );
  const periodLabel = annual
    ? periodKey
    : new Intl.DateTimeFormat("pt-BR", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${periodKey}-01T00:00:00Z`));
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
    <div className={`app-shell${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
      <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
      <aside>
        <div className="sidebar-header">
          <a className="brand" href="#" aria-label="Meu financeiro">
            <WalletCards size={24} aria-hidden="true" />
            <span>Meu financeiro</span>
          </a>
          <button
            className="sidebar-toggle"
            type="button"
            aria-label={sidebarCollapsed ? "Expandir menu lateral" : "Minimizar menu lateral"}
            title={sidebarCollapsed ? "Expandir menu lateral" : "Minimizar menu lateral"}
            aria-expanded={!sidebarCollapsed}
            aria-controls="main-navigation"
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={18} aria-hidden="true" /> : <PanelLeftClose size={18} aria-hidden="true" />}
          </button>
        </div>
        <p className="workspace-label">Espaço pessoal · privado</p>
        <button
          ref={mobileNavButton}
          className="mobile-nav-toggle"
          type="button"
          aria-controls="main-navigation"
          aria-expanded={mobileNavOpen}
          onClick={() => setMobileNavOpen((open) => !open)}
        >
          {mobileNavOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          <span>{mobileNavOpen ? "Fechar navegação" : "Abrir navegação"}</span>
        </button>
        <nav id="main-navigation" className={mobileNavOpen ? "open" : ""} aria-label="Menu principal">
          {pages.map((p) => {
            const Icon = pageIcons[p];
            return (
              <button
                key={p}
                className={`nav-item${page === p ? " selected" : ""}`}
                aria-current={page === p ? "page" : undefined}
                aria-label={p}
                title={p}
                onClick={() => {
                  setPage(p);
                  if (window.matchMedia("(max-width: 1199px)").matches) {
                    setMobileNavOpen(false);
                    requestAnimationFrame(() => mobileNavButton.current?.focus());
                  }
                }}
              >
                <Icon size={18} aria-hidden="true" />
                <span className="nav-label">{p}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <button
            className="logout"
            type="button"
            aria-label="Sair da conta"
            title="Sair da conta"
            onClick={() =>
              void action(() =>
                supabase!.auth.signOut().then(({ error }) => {
                  if (error) throw error;
                }),
              )
            }
          >
            <LogOut size={18} aria-hidden="true" />
            <span className="nav-label">Sair da conta</span>
          </button>
          <button
            className="theme-toggle"
            type="button"
            aria-label={theme === "dark" ? "Usar tema claro" : "Usar tema escuro"}
            title={theme === "dark" ? "Usar tema claro" : "Usar tema escuro"}
            onClick={() =>
              setTheme((current) => (current === "dark" ? "light" : "dark"))
            }
          >
            {theme === "dark" ? (
              <Sun size={18} aria-hidden="true" />
            ) : (
              <Moon size={18} aria-hidden="true" />
            )}
          </button>
        </div>
      </aside>
      <main className="workspace" id="main-content" tabIndex={-1}>
        <header>
          <div className="page-heading">
            <div>
              <span className="eyebrow">Seu dinheiro, com clareza</span>
              <h1>{page}</h1>
            </div>
            <ContextHelp title="navegação e período">
              <p>Use o menu para trocar de área. No celular, abra a navegação; em telas maiores, você pode minimizar a barra lateral sem perder os atalhos.</p>
              <p>O período selecionado muda os resumos, metas e o Livro financeiro. Ative Visão anual para consultar o ano da data escolhida.</p>
              <p>O controle de tema alterna entre claro e escuro. Sair da conta encerra a sessão e remove os dados financeiros da tela.</p>
            </ContextHelp>
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
            <div className="overview-intro">
              <div>
                <p className="muted">
                  Consumo por competência. Saldos por data bancária.
                </p>
                <ContextHelp title="indicadores da visão geral">
                  <p>Renda confirmada soma receitas elegíveis registradas. Consumo soma compras e parcelas, descontando estornos.</p>
                  <p>Resultado do período é renda menos consumo. Aportes mostram transferências para objetivos e não são tratados como despesa nem como renda.</p>
                  <p>Esses indicadores seguem a competência selecionada; os saldos das contas usam a data bancária.</p>
                </ContextHelp>
              </div>
              <span className="overview-period">
                {annual ? "Ano" : "Competência"} · {periodLabel}
              </span>
            </div>
            <div className="metrics overview-metrics">
              <Metric
                title="Renda confirmada"
                value={brl(summary.income)}
                icon={CircleDollarSign}
                tone={summary.income > 0n ? "positive" : undefined}
                detail={
                  summary.confirmed
                    ? "Créditos elegíveis registrados"
                    : "Renda ainda não confirmada"
                }
              />
              <Metric
                title="Consumo"
                value={brl(summary.consumption)}
                icon={ShoppingBag}
                tone={summary.consumption > 0n ? "negative" : undefined}
                detail="Compras menos estornos"
              />
              <Metric
                title="Resultado do período"
                value={brl(summary.income - summary.consumption)}
                icon={ChartPie}
                tone={summary.income > summary.consumption ? "positive" : summary.income < summary.consumption ? "negative" : undefined}
                detail="Renda menos consumo"
              />
              <Metric
                title="Aportes"
                value={brl(summary.contributions)}
                icon={PiggyBank}
                detail="Movimentos para seus objetivos"
              />
            </div>
            <section>
              <SectionTitle
                icon={ChartPie}
                title="Disponível por categoria"
                help={
                  <>
                    <p>Veja quanto ainda pode gastar em cada categoria, conforme a meta e a renda consideradas no período.</p>
                    <p>Para começar, crie uma meta na aba Orçamentos. Metas percentuais usam renda confirmada ou a previsão informada por você.</p>
                  </>
                }
              />
              <Budgets data={data} period={periodKey} />
            </section>
            <section>
              <SectionTitle icon={Landmark} title="Minhas contas" help={<><p>O saldo parte do valor inicial e considera movimentos aprovados até a data bancária de hoje.</p><p>Se a lista estiver vazia, cadastre sua primeira conta em Contas e cartões. Importações e lançamentos precisam de uma conta local.</p></>} />
              {!accounts.length && (
                <p>
                  Comece cadastrando sua primeira conta. Seu espaço começa
                  vazio.
                </p>
              )}
              <div className="cards overview-account-grid">
                {data.financial_accounts.map((a) => (
                  <article className="overview-account-card" key={a.id}>
                    <small>
                      {a.institution} ·{" "}
                      {a.kind === "benefit"
                        ? "Benefício"
                        : a.kind === "credit"
                          ? "Cartão"
                          : "Conta"}
                    </small>
                    <h3>{a.name}</h3>
                    <MoneyValue
                      value={accountBalance(a, data.transactions, today())}
                      className="account-balance"
                    />
                  </article>
                ))}
              </div>
            </section>
            <section>
              <SectionTitle icon={ListChecks} title="Próximos passos" help={<><p>Cadastre uma conta para registrar movimentos ou vincular uma origem externa. Para trazer um extrato, use Importar arquivo e revise cada linha antes de contabilizar.</p><p>Os atalhos apenas trocam de aba; nenhuma informação é gravada ao usá-los.</p></>} />
              <div className="actions">
                <button onClick={() => setPage("Contas e cartões")}>
                  <Landmark size={18} aria-hidden="true" />
                  Cadastrar conta
                </button>
                <button
                  className="secondary"
                  onClick={() => setPage("Importar e revisar")}
                >
                  <FileText size={18} aria-hidden="true" />
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
              <SectionTitle icon={Landmark} title="Contas financeiras" description="Consulte saldos e gerencie as contas usadas pelos seus lançamentos." help={<><p>Cadastre uma conta para cada conta bancária, cartão ou caixinha que deseja acompanhar. Escolha o tipo correspondente.</p><p>O saldo inicial é o valor anterior aos movimentos que você vai registrar. Para um cartão com dívida, informe um saldo negativo.</p><p>Arquivar preserva o histórico e retira a conta dos seletores que mostram contas ativas. Reative-a quando precisar usá-la novamente.</p></>} />
              <h3 className="form-subheading">Adicionar conta</h3>
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
              <div className="account-grid">
                {data.financial_accounts.map((a) => (
                  <article className="account-card" key={a.id}>
                    <div className="account-card-top">
                      <span className="account-kind-icon" aria-hidden="true">
                        {(() => { const Icon = accountKindIcons[a.kind]; return <Icon size={21} />; })()}
                      </span>
                      <div>
                        <span className="account-kind">{accountKindLabels[a.kind]}</span>
                        <h3>{a.name}</h3>
                      </div>
                      {a.archived && <span className="status-badge">Arquivada</span>}
                    </div>
                    <p className="account-institution">{a.institution}</p>
                    <ContextHelp title={`conta ${a.name}`}><p>O saldo parte do valor inicial e inclui movimentos aprovados. Arquivar preserva o histórico e impede o uso em seletores que mostram apenas contas ativas; você pode reativá-la.</p></ContextHelp>
                    <span className="account-balance-label">Saldo atual</span>
                    <MoneyValue
                      value={accountBalance(a, data.transactions)}
                      className="account-balance"
                    />
                    <button className="secondary" onClick={() => void action(() => mutate("financial_accounts", { archived: !a.archived }, a.id))}>
                      {a.archived ? "Reativar conta" : "Arquivar conta"}
                    </button>
                  </article>
                ))}
              </div>
            </section>
            <section>
              <SectionTitle icon={CreditCard} title="Cartões de crédito" help={<><p>Primeiro, cadastre acima uma conta financeira do tipo Cartão de crédito. Depois selecione essa conta para informar fechamento, vencimento e limite.</p><p>Para importar pelo Meu Pluggy, vincule o cartão remoto a essa conta local na aba Meu Pluggy.</p></>} />
              {creditAccounts.length === 0 ? (
                <p className="section-description">Cadastre uma conta do tipo cartão de crédito acima para configurar fechamento, vencimento e limite.</p>
              ) : (<Form
                fields={[
                  {
                    ...accountField,
                    options: creditAccounts,
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
              )}
              {data.credit_cards.length === 0 ? <p className="empty-state">Nenhum cartão configurado ainda.</p> : data.credit_cards.map((c) => (
                <article className="credit-card-summary" key={c.id}>
                  <h3>
                    <CreditCard size={18} aria-hidden="true" />
                    <span>
                      {name(c.account_id)}{" "}
                      {c.last_four ? `•••• ${c.last_four}` : ""}
                    </span>
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
            <section className="transaction-entry-section">
              <SectionTitle
                icon={Receipt}
                title="Registrar movimento"
                description="Informe os dados do movimento. A natureza indica se o valor é uma entrada, saída ou transferência."
                help={<><p>Escolha a conta, informe um valor positivo e selecione a natureza do movimento. Para transferência, aporte, resgate e pagamento de fatura, selecione também a conta de destino.</p><p>Data do evento é quando o movimento aconteceu; data bancária afeta o saldo; competência determina o período financeiro. Categoria e subcategoria são opcionais, e a subcategoria pertence à categoria escolhida.</p><p>Para um estorno, selecione a compra aprovada. Se a receita corresponde a um holerite cadastrado, você pode vinculá-lo.</p></>}
              />
              <TransactionForm
                data={data}
                className="transaction-form"
                label="Registrar lançamento"
                submit={(p) => command("record_transaction", { p })}
              />
            </section>
            <section className="ledger-section">
              <div className="ledger-heading">
                <SectionTitle icon={Landmark} title="Livro financeiro" description={`${ledgerRows.length} movimento(s) em ${periodLabel}.`} help={<><p>O livro mostra movimentos da competência selecionada. Pesquise pela descrição e use a classificação na linha para adicionar ou editar categoria e subcategoria.</p><p>Anular preserva o histórico e também anula o par, quando houver. O CSV exporta o período; para restaurar os dados, use o backup JSON em Perfil e backup.</p></>} />
                <button
                  className="secondary export-button"
                  onClick={() => downloadText(ledgerCsv(ledgerRows), `lancamentos-${periodKey}.csv`)}
                >
                  <Download size={18} aria-hidden="true" />
                  Exportar período em CSV
                </button>
              </div>
              <div className="ledger-toolbar">
                <label className="search-field">
                  <Search size={18} aria-hidden="true" />
                  <span>Buscar descrição</span>
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Descrição do lançamento"
                  />
                </label>
              </div>
              {ledgerRows.length === 0 ? (
                <div className="empty-state" role="status">
                  <Receipt size={24} aria-hidden="true" />
                  <p>
                    {search.trim()
                      ? "Nenhum lançamento corresponde à busca."
                      : "Não há lançamentos neste período."}
                  </p>
                </div>
              ) : (
                <div className="table-wrap ledger-table-wrap" tabIndex={0} aria-label="Livro financeiro">
                  <table className="ledger-table">
                    <caption className="visually-hidden">
                      Lançamentos por data, descrição, conta, natureza, categoria e valor.
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Data</th>
                        <th scope="col">Movimento</th>
                        <th scope="col">Classificação</th>
                        <th scope="col">Valor</th>
                        <th scope="col">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerRows.map((t) => (
                        <tr key={t.id} className={t.status === "void" ? "void-row" : ""}>
                          <td>
                            {displayDate(t.event_date)}
                            <small>Competência {displayMonth(t.competence)}</small>
                          </td>
                          <td className="ledger-description-cell">
                            <strong>{t.description}</strong>
                            <div className="ledger-row-meta">
                              <span>{name(t.account_id)}</span>
                              <span className="nature-label">{natureLabels[t.nature]}</span>
                              {t.status === "void" && <span className="status-badge">Anulado</span>}
                            </div>
                          </td>
                          <td className="ledger-classification-cell">
                            <strong>{category(t.category_id)}</strong>
                            {t.subcategory_id && (
                              <small>{data.subcategories.find((subcategory) => subcategory.id === t.subcategory_id)?.name ?? "Subcategoria"}</small>
                            )}
                            {t.status === "approved" && (
                              <Classification data={data} transaction={t} refresh={refresh} />
                            )}
                          </td>
                          <td className="money">
                            <MoneyValue
                              value={t.amount_cents}
                              tone={t.nature === "income" ? "positive" : t.nature === "expense" ? "negative" : "neutral"}
                              className="ledger-amount"
                            />
                          </td>
                          <td>
                            {t.status === "approved" && (
                              <button
                                className="secondary void-button"
                                onClick={() => {
                                  if (window.confirm("Anular este movimento e, se houver, seu par patrimonial? O histórico será preservado."))
                                    void action(() => command("void_transaction", { target: t.id }));
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
              )}
            </section>
          </>
        )}
        {page === "Orçamentos" && (
          <>
            <section>
              <SectionTitle icon={ChartPie} title="Definir meta" description="Planeje limites fixos ou percentuais sem alterar os lançamentos já registrados." help={<><p>Escolha uma categoria, o primeiro dia do período e a periodicidade. Informe um limite fixo ou um percentual da renda.</p><p>Na meta percentual, deixe a previsão vazia para usar somente renda confirmada. Uma previsão informada é uma base de planejamento e não vira receita.</p><p>Salvar novamente a mesma categoria, período e periodicidade atualiza a meta existente.</p></>} />
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
              <SectionTitle icon={ChartPie} title="Metas do período" help={<><p>As metas desta competência ou ano comparam o limite ao consumo aprovado da categoria.</p><p>Sem renda confirmada ou previsão, uma meta percentual permanece a confirmar. Disponível nunca fica negativo; o valor excedido aparece separadamente.</p></>} />
              <Budgets data={data} period={periodKey} />
            </section>
          </>
        )}
        {page === "Caixinhas" && (
          <>
            <section>
              <SectionTitle icon={PiggyBank} title="Novo objetivo" description="Associe o objetivo a uma conta de caixinha e acompanhe aportes e resgates." help={<><p>Cadastre antes uma conta financeira do tipo Caixinha/investimento e associe o objetivo a ela.</p><p>Depois registre aportes ou resgates em Lançamentos, escolhendo as contas de origem e destino. Criar ou editar o objetivo não movimenta dinheiro.</p></>} />
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
            <section className="goal-list-section">
              <SectionTitle icon={PiggyBank} title="Seus objetivos" help={<><p>O progresso usa o saldo da conta de caixinha: saldo inicial mais movimentos aprovados. A meta e o prazo servem para acompanhamento.</p><p>Se não houver objetivos, crie uma conta de caixinha e depois cadastre o objetivo acima.</p></>} />
              {data.savings_goals.length === 0 && <p className="empty-state">Você ainda não cadastrou objetivos.</p>}
              <div className="cards goal-grid">
              {data.savings_goals.map((g) => {
                const a = data.financial_accounts.find(
                  (a) => a.id === g.account_id,
                )!;
                const balance = accountBalance(a, data.transactions);
                return (
                  <article key={g.id}>
                    <h3>{g.name}</h3>
                    <ContextHelp title={`objetivo ${g.name}`}><p>O progresso acompanha o saldo aprovado da conta de caixinha associada. Para aumentar ou reduzir esse saldo, registre um aporte ou resgate em Lançamentos; editar a meta não movimenta dinheiro.</p></ContextHelp>
                    <MoneyValue value={balance} className="goal-balance" />
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
            </section>
          </>
        )}
        {page === "Caixinhas" && <GoalEditor data={data} refresh={refresh} />}
        {page === "Receitas e holerites" && (
          <>
            <section>
              <SectionTitle icon={FileText} title="Conferir holerite" description="Registre a composição da remuneração e concilie adiantamento e líquido com as receitas." help={<><p>Informe proventos, descontos sem adiantamento, adiantamento já recebido e líquido final. O cadastro só é aceito quando os valores fecham.</p><p>O holerite documenta a remuneração, mas não cria receita. Registre os créditos bancários em Lançamentos e vincule-os ao holerite; VR/VA usa uma conta de benefício.</p></>} />
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
              {data.payslips.length === 0 && <p className="empty-state">Nenhum holerite cadastrado.</p>}
              {data.payslips.map((p) => {
                const linked = data.transactions
                  .filter(
                    (t) => t.payslip_id === p.id && t.status === "approved",
                  )
                  .reduce((s, t) => s + BigInt(t.amount_cents), 0n);
                return (
                  <article className="summary-card" key={p.id}>
                    <h3>
                      {p.employer} · {p.competence.slice(0, 7)}
                    </h3>
                    <ContextHelp title={`holerite ${p.employer}`}><p>Compare o adiantamento e o líquido aos créditos aprovados vinculados. O holerite não cria receita; registre e vincule os créditos em Lançamentos.</p></ContextHelp>
                    <p>
                      Adiantamento {brl(p.advance_cents)} + líquido{" "}
                      {brl(p.net_cents)}
                    </p>
                    <p>
                      Créditos vinculados {brl(linked)} · diferença a conciliar{" "}
                      <MoneyValue
                        value={BigInt(p.advance_cents) + BigInt(p.net_cents) - linked}
                      />
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
        {page === "Meu Pluggy" && (
          <Connections
            data={data}
            refresh={refresh}
            openAccounts={() => setPage(pages[2])}
          />
        )}
        {page === "Categorias e regras" && (
          <>
            <section>
              <SectionTitle icon={Tags} title="Nova categoria" description="Organize lançamentos com categorias próprias deste workspace." help={<><p>Crie categorias para organizar seus lançamentos, como alimentação ou transporte. Elas pertencem somente ao seu espaço.</p><p>Depois você pode criar subcategorias e regras que sugerem a classificação na revisão. A categoria não determina a natureza do movimento.</p></>} />
              <Form
                fields={[{ name: "name", label: "Nome" }]}
                submit={(v) => mutate("categories", v)}
              />
              <div className="chips category-chips">
                {data.categories.map((c) => (
                  <span key={c.id}>{c.name}</span>
                ))}
              </div>
            </section>
            <section>
              <SectionTitle icon={Tags} title="Nova subcategoria" help={<><p>Cadastre primeiro a categoria e selecione-a aqui. A subcategoria detalha essa categoria e só poderá ser escolhida junto dela.</p><p>Ao trocar de categoria em um formulário, selecione novamente uma subcategoria compatível.</p></>} />
              <Form
                fields={[
                  categoryField,
                  { name: "name", label: "Nome da subcategoria" },
                ]}
                submit={(v) => mutate("subcategories", v)}
              />
            </section>
            <section>
              <SectionTitle icon={ListChecks} title="Regra de classificação e automação" description="Classifique pendências e, quando explicitamente autorizado, aprove movimentos completos e sem duplicidade." help={<><p>Informe um trecho literal, categoria e prioridade. Você pode limitar a regra à conta observada e à direção do valor.</p><p>Para automatizar, defina também tipo de movimentação, subcategoria e, nos movimentos patrimoniais, a contrapartida. A automação ainda bloqueia possíveis duplicidades.</p><p>Ativar, desativar ou editar uma regra não altera movimentos já aprovados.</p></>} />
              <p>
                Correspondência literal, sem regex. Prioridade menor vence.
                A automação é opcional e nunca altera decisões já aprovadas.
              </p>
              <Form
                fields={[
                  { name: "keyword", label: "Texto que a descrição contém" },
                  {
                    name: "priority",
                    label: "Prioridade",
                    type: "number",
                    value: "100",
                  },
                  {
                    name: "account_id",
                    label: "Conta observada (opcional)",
                    required: false,
                    options: data.financial_accounts
                      .filter((item) => !item.archived)
                      .map((item) => [item.id, `${item.name} · ${item.institution}`]),
                  },
                  {
                    name: "amount_direction",
                    label: "Direção na conta observada",
                    value: "any",
                    options: [
                      ["any", "Entrada ou saída"],
                      ["debit", "Somente saída"],
                      ["credit", "Somente entrada"],
                    ],
                  },
                  {
                    name: "transaction_nature",
                    label: "Tipo de movimentação para automação",
                    required: false,
                    options: Object.entries(natureLabels),
                  },
                  {
                    name: "counterpart_account_id",
                    label: "Conta de contrapartida (quando exigida)",
                    required: false,
                    options: data.financial_accounts
                      .filter((item) => !item.archived)
                      .map((item) => [item.id, `${item.name} · ${item.institution}`]),
                  },
                  {
                    name: "auto_approve",
                    label: "Aprovação automática",
                    value: "false",
                    options: [
                      ["false", "Não; manter para revisão"],
                      ["true", "Sim; se completa e sem duplicidade"],
                    ],
                  },
                ]}
                children={<CategorySubcategoryFields data={data} />}
                submit={(v) =>
                  mutate("categorization_rules", {
                    ...v,
                    priority: Number(v.priority),
                    subcategory_id: v.subcategory_id || null,
                    account_id: v.account_id || null,
                    amount_direction: v.amount_direction,
                    transaction_nature: v.transaction_nature || null,
                    counterpart_account_id: v.counterpart_account_id || null,
                    auto_approve: v.auto_approve === "true",
                  })
                }
              />
              {data.categorization_rules.length === 0 && <p className="empty-state">Nenhuma regra de sugestão cadastrada.</p>}
              <div className="rule-list">
              {data.categorization_rules.map((r) => (
                <article className="rule-card" key={r.id}>
                  <strong>{r.keyword}</strong>
                  <ContextHelp title={`regra ${r.keyword}`}><p>Esta regra ativa pode sugerir uma categoria para linhas pendentes cuja descrição contenha o texto informado. Desativá-la impede novas sugestões por ela; movimentos já aprovados não são alterados.</p></ContextHelp>
                  <p>
                    {category(r.category_id)} · prioridade {r.priority}
                  </p>
                  <p>
                    {r.transaction_nature
                      ? natureLabels[r.transaction_nature]
                      : "Somente sugestão"}
                    {r.auto_approve ? " · aprovação automática" : " · revisão manual"}
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
              </div>
            </section>
          </>
        )}
        {page === "Categorias e regras" && (
          <>
            <PrivateConfigurationImport refresh={refresh} />
            <CategoryEditors data={data} refresh={refresh} />
          </>
        )}
        {page === "Perfil e backup" && (
          <>
            <section>
              <SectionTitle icon={Settings2} title="Meu perfil" description="Preferências de exibição e idioma da sua área pessoal." help={<><p>Você pode alterar o nome exibido na aplicação. A tela informa as configurações atualmente adotadas: real brasileiro, português do Brasil e fuso America/Sao_Paulo.</p><p>Moeda, idioma e fuso ainda não são editáveis neste formulário.</p></>} />
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
              <SectionTitle icon={Download} title="Backup privado" description="Exporte e restaure somente os dados deste workspace." help={<><p>Exporte o JSON completo e guarde-o em local protegido: o arquivo contém o histórico financeiro do seu espaço.</p><p>O CSV do Livro financeiro serve para consulta do período e não substitui este backup. Para recuperar dados, use Restaurar backup abaixo.</p></>} />
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
              <SectionTitle icon={Settings2} title="Solicitar exclusão da conta" description="Revise as consequências e exporte seus dados antes de registrar a solicitação." help={<><p>Exporte seu backup antes de solicitar a exclusão. O botão registra o pedido, mas não apaga os dados imediatamente.</p><p>Um operador precisa confirmar sua identidade e acompanhar o procedimento. A exclusão autônoma ainda não está disponível.</p></>} />
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
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: "positive" | "negative";
}) {
  return (
    <article className="metric">
      <div className="metric-heading">
        <span>{title}</span>
        <Icon size={20} aria-hidden="true" />
      </div>
      <strong className={tone ? `metric-value ${tone}` : "metric-value"}>
        {value}
      </strong>
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
              {r.available === null ? (
                "Renda ainda não confirmada"
              ) : (
                <><MoneyValue value={r.available} /> disponíveis</>
              )}
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
            <small>Excedente <MoneyValue value={r.excess ?? 0n} tone={(r.excess ?? 0n) > 0n ? "negative" : "neutral"} /></small>
          </article>
        );
      })}
    </div>
  ) : (
    <p>Nenhuma meta cadastrada para este período.</p>
  );
}
