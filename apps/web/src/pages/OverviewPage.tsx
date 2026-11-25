import { Badge, Button, Card, DashboardColumns, MetricCard, CashFlowChart, ColumnChart, DataState, EmptyState, Icon, NextIcon, PreviousIcon, TrendLineChart, type CashFlowPoint, type DataStatus } from '@personal-finance/ui';
import type { ReactNode } from 'react';
import { cardCommitmentSeries, cashFlowSeries, competenceWindow, cumulativeResultSeries } from '../lib/overview-charts';
import { budgetAttention, monthComparison, nextCardCommitment, reviewAttention } from '../lib/overview-attention';
import { useHashParams } from '../hooks/useHashParams';
import { useState } from 'react';
import { demoCashFlow } from '../lib/demo-charts';
import { TransactionsDemo } from '../components/TransactionsDemo';
import { accountsBalance, demoAccounts, demoBudgets, demoInvoices, invoiceOpenCents, monthlyReport } from '../lib/demo-finance';
import { demoTransactions, formatCentsBRL, formatCompetence } from '../lib/demo-transactions';
import { accountBalance, addCompetenceMonths, categoryBudgetProgress, ledgerTotals, type CategoryBudgetProgress } from '@personal-finance/domain';
import type { LedgerState } from '../ledger/useLedger';
import type { PageProps } from './PageProps';

const currentCompetence = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

function PeriodNavigator({ period, onChange }: { period: string; onChange: (period: string) => void }) {
  const current = currentCompetence();
  return <div className="period-navigator" role="group" aria-label="Período da visão geral">
    <Button variant="ghost" size="sm" aria-label="Mês anterior" onClick={() => onChange(addCompetenceMonths(period, -1))}><Icon icon={PreviousIcon} size="sm" /></Button>
    <strong className="period-navigator__label" aria-live="polite">{formatCompetence(period)}</strong>
    <Button variant="ghost" size="sm" aria-label="Próximo mês" onClick={() => onChange(addCompetenceMonths(period, 1))}><Icon icon={NextIcon} size="sm" /></Button>
    <Button variant="secondary" size="sm" disabled={period === current} onClick={() => onChange(current)}>Mês atual</Button>
  </div>;
}

type BudgetItem = { budget: { id: string }; category: string; progress: CategoryBudgetProgress };

/** “+ R$ 10,00 vs. out/2026”: sinal e texto carregam o sentido; a cor só reforça se a variação é boa ou ruim. */
function delta(valueCents: bigint, previous: string, higherIsBetter: boolean): { text: string; tone: 'positive' | 'negative' | 'neutral' } {
  if (valueCents === 0n) return { text: `Igual a ${formatCompetence(previous)}`, tone: 'neutral' };
  const text = `${valueCents > 0n ? '+' : '−'} ${formatCentsBRL(valueCents > 0n ? valueCents : -valueCents)} vs. ${formatCompetence(previous)}`;
  return { text, tone: (valueCents > 0n) === higherIsBetter ? 'positive' : 'negative' };
}

function AttentionPanel({ review, nextCommitment, budgets }: {
  review: ReturnType<typeof reviewAttention>;
  nextCommitment: ReturnType<typeof nextCardCommitment>;
  budgets: ReturnType<typeof budgetAttention>;
}) {
  const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
  const budgetTitle = budgets.exceeded ? `${plural(budgets.exceeded, 'meta acima', 'metas acima')} do teto`
    : budgets.approaching ? `${plural(budgets.approaching, 'meta perto', 'metas perto')} do teto`
      : budgets.highest ? 'Metas dentro do teto' : 'Nenhuma meta definida';
  const items = [
    { href: '#review', action: 'Abrir revisão',
      title: review.total ? `${plural(review.total, 'lançamento', 'lançamentos')} para revisar` : 'Revisão em dia',
      detail: review.total ? `${plural(review.links, 'vínculo', 'vínculos')} e ${plural(review.categories, 'categoria', 'categorias')} pendentes` : 'Nenhuma pendência de categoria ou vínculo' },
    { href: '#cards', action: 'Ver cartões',
      title: nextCommitment ? `Fatura de ${nextCommitment.label} · ${formatCentsBRL(nextCommitment.valueCents)}` : 'Nenhuma fatura prevista',
      detail: nextCommitment ? (nextCommitment.projected ? 'Inclui parcelas previstas' : 'Fatura do período') : 'Sem compromissos de cartão à frente' },
    { href: '#budgets', action: 'Ver orçamentos', title: budgetTitle,
      detail: budgets.highest ? `${budgets.highest.category} em ${formatBasisPoints(budgets.highest.usageBasisPoints)} do teto` : 'Defina tetos por categoria' }
  ];
  return <section className="attention" aria-labelledby="attention-title">
    <h2 id="attention-title">Precisa de atenção</h2>
    <div className="attention__items">{items.map(item => <a key={item.href} href={item.href} className="attention__item">
      <strong>{item.title}</strong><span className="muted">{item.detail}</span><span className="attention__action">{item.action} →</span>
    </a>)}</div>
  </section>;
}

function formatBasisPoints(value: bigint): string {
  const decimals = value % 100n;
  return `${value / 100n}${decimals ? `,${decimals.toString().padStart(2, '0')}` : ''}%`;
}

function OverviewCharts({ ledger, period, flow, budgets, commitments }: {
  ledger: LedgerState; period: string; flow: CashFlowPoint[]; budgets: BudgetItem[]; commitments: ReturnType<typeof cardCommitmentSeries>;
}) {
  const data = ledger.data;
  const status = ledger.status === 'idle' ? 'loading' : ledger.status;
  const chartState = (children: ReactNode, chartKind: 'bars' | 'line') => <DataState status={status} kind="chart" chartKind={chartKind}
    errorDescription={ledger.error} onRetry={() => void ledger.reload()}>{children}</DataState>;
  const cashFlowCard = <Card><div className="chart-card__heading"><h2>Receitas e despesas</h2><a href={`#transactions?period=${period}`}>Ver lançamentos de {formatCompetence(period)}</a></div>
      <p className="muted">Seis meses até {formatCompetence(period)}, sem transferências próprias.</p>
      {chartState(<CashFlowChart data={flow} formatValue={formatCentsBRL} title="Receitas e despesas por mês" layout="vertical" collapsibleDetails />, 'bars')}</Card>;
  const resultCard = <Card><h2>Resultado acumulado</h2><p className="muted">Soma de receitas menos despesas desde o início da janela.</p>
      {chartState(<TrendLineChart data={cumulativeResultSeries(flow)} formatValue={formatCentsBRL} title="Resultado acumulado por mês" collapsibleDetails />, 'line')}</Card>;
  const budgetsCard = <Card><h2>Metas do período</h2><p className="muted">Orçado versus realizado em {formatCompetence(period)}.</p>
      {budgets.length === 0 ? <EmptyState title="Nenhuma meta ainda" description="Defina quanto quer gastar por mês em cada categoria e acompanhe aqui." action={<a href="#budgets">Definir metas</a>} />
        : <ul className="overview-budgets" aria-label="Orçado versus realizado por categoria">{budgets.map(({ budget, category, progress }) => {
          const label = progress.status === 'exceeded' ? 'Acima do teto' : progress.status === 'approaching' ? 'Próximo do teto' : 'Dentro do teto';
          return <li key={budget.id}>
            <div className="summary-row"><strong>{category}</strong><Badge tone={progress.status === 'exceeded' ? 'expense' : progress.status === 'within' ? 'income' : 'neutral'}>{label}</Badge></div>
            <progress className={`budget-progress ${progress.status === 'exceeded' ? 'budget-progress--exceeded' : ''}`} max={10000}
              value={Number(progress.usageBasisPoints > 10000n ? 10000n : progress.usageBasisPoints)} aria-label={`Uso da meta de ${category}`} />
            <p className="muted">{formatCentsBRL(progress.usedCents)} realizados de {formatCentsBRL(progress.limitCents)} orçados</p>
          </li>;
        })}</ul>}</Card>;
  const commitmentsCard = <Card><h2>Compromissos de cartão</h2><p className="muted">Faturas por vencimento e parcelas futuras já assumidas.</p>
      {(data?.creditCards.length ?? 0) === 0 ? <EmptyState title="Nenhum cartão ainda" description="Quando o banco do cartão estiver conectado, as faturas e parcelas futuras aparecem aqui." action={<a href="#connections">Conectar banco</a>} />
        : chartState(<ColumnChart data={commitments} formatValue={formatCentsBRL} title="Compromissos de cartão por mês" valueLabel="Fatura" collapsibleDetails />, 'bars')}</Card>;
  return <DashboardColumns left={<>{cashFlowCard}{budgetsCard}</>} right={<>{resultCard}{commitmentsCard}</>} />;
}

export function OverviewPage({ ledger, headerAction, intro }: PageProps) {
  const [chartStatus,setChartStatus]=useState<DataStatus>('success');
  const [params, setParams] = useHashParams();
  if (ledger) {
    const data = ledger.data;
    const requested = params.get('period') ?? '';
    const period = /^\d{4}-(0[1-9]|1[0-2])$/.test(requested) ? requested : currentCompetence();
    const transactions = data?.transactions ?? [];
    const totals = ledgerTotals(transactions.filter(row => row.competence === period));
    // Patrimônio ao fim do período: lançamentos de competências futuras ainda não aconteceram.
    const rowsUntilPeriod = transactions.filter(row => row.competence <= period);
    const balance = (data?.accounts ?? []).filter(account => account.type !== 'credit_card').reduce((sum, account) => sum + accountBalance(account, rowsUntilPeriod), 0n);
    const comparison = monthComparison(transactions, data?.accounts ?? [], period);
    const balanceDelta = delta(comparison.balanceDeltaCents, comparison.previous, true);
    const incomeDelta = delta(comparison.incomeDeltaCents, comparison.previous, true);
    const expenseDelta = delta(comparison.expenseDeltaCents, comparison.previous, false);
    const flow = cashFlowSeries(transactions, competenceWindow(period, 6)).map((point, index, all) => ({ ...point, current: index === all.length - 1 }));
    const categories = new Map((data?.categories ?? []).map(category => [category.id, category.name]));
    const budgets = (data?.budgets ?? []).map(budget => ({ budget, category: categories.get(budget.categoryId) ?? 'Categoria indisponível', progress: categoryBudgetProgress(budget, transactions, period) }));
    const commitments = cardCommitmentSeries({ statements: data?.cardStatements ?? [], entries: data?.cardStatementEntries ?? [], transactions,
      installments: data?.cardInstallments ?? [], months: competenceWindow(addCompetenceMonths(period, 6), 9), period });
    return <div className="template-page">
      <div className="template-heading"><div><p className="eyebrow">PAINEL FINANCEIRO</p><h1>Visão geral</h1><p className="muted">Como está o mês. Dinheiro movido entre suas próprias contas não conta como receita nem gasto.</p></div><div className="template-heading__actions"><PeriodNavigator period={period} onChange={next => setParams({ period: next })} />{headerAction}</div></div>
      {intro}
      <div className="template-metrics" aria-label="Indicadores do mês">
        <MetricCard label="Patrimônio em contas" value={formatCentsBRL(balance)} supportingText={balanceDelta.text} supportingTone={balanceDelta.tone} />
        <MetricCard label="Receitas do período" value={formatCentsBRL(totals.incomeCents)} tone="income" supportingText={incomeDelta.text} supportingTone={incomeDelta.tone} />
        <MetricCard label="Despesas do período" value={formatCentsBRL(totals.expenseCents)} tone="expense" supportingText={expenseDelta.text} supportingTone={expenseDelta.tone} />
        <MetricCard label="Resultado do período" value={`${totals.netCents > 0n ? '+ ' : ''}${formatCentsBRL(totals.netCents)}`}
          valueTone={totals.netCents > 0n ? 'positive' : totals.netCents < 0n ? 'negative' : 'neutral'} supportingText="Receitas menos despesas"
          info="Receitas menos despesas do mês. Transferências entre suas contas, pagamentos de fatura, aportes e resgates ficam de fora." />
      </div>
      <AttentionPanel review={reviewAttention(transactions, data ?? { semanticOverrides: [], links: [], savingsMovements: [], cardStatementEntries: [] })}
        nextCommitment={nextCardCommitment(commitments, period)} budgets={budgetAttention(budgets)} />
      <OverviewCharts ledger={ledger} period={period} flow={flow} budgets={budgets} commitments={commitments} />
    </div>;
  }
  const report = monthlyReport(demoTransactions);
  const openInvoices = demoInvoices.reduce((sum, row) => sum + invoiceOpenCents(row), 0n);
  const budgetWarnings = demoBudgets.filter(row => row.usedCents > row.limitCents).length;
  return <div className="template-page">
    <div className="template-heading">
      <div><p className="eyebrow">PAINEL FINANCEIRO</p><h1>Visão geral</h1><p className="muted">Um resumo ilustrativo de contas, movimentações e compromissos.</p></div>
      <div className="template-heading__actions"><Badge>Novembro 2026 · Demo</Badge>{headerAction}</div>
    </div>
    <div className="template-metrics" aria-label="Indicadores financeiros fictícios">
      <MetricCard label="Patrimônio em contas" value={formatCentsBRL(accountsBalance(demoAccounts))} supportingText="Saldos de exemplo"/>
      <MetricCard label="Receitas do período" value={formatCentsBRL(report.incomeCents)} valueTone="positive" supportingText="Exclui transferências próprias" tone="income"/>
      <MetricCard label="Despesas do período" value={formatCentsBRL(report.expenseCents)} valueTone="negative" supportingText="Gastos de exemplo" tone="expense"/>
      <MetricCard label="Faturas em aberto" value={formatCentsBRL(openInvoices)} supportingText="O que falta pagar nos cartões"/>
    </div>
    <div className="template-grid">
      <Card><h2>Acompanhamento</h2><p className="muted">Alertas de exemplo para orientar as próximas decisões.</p>
        <div className="summary-row"><span>Orçamentos acima do limite</span><strong>{budgetWarnings}</strong></div>
        <div className="summary-row"><span>Contas acompanhadas</span><strong>{demoAccounts.length}</strong></div>
        <div className="summary-row"><span>Faturas de exemplo</span><strong>{demoInvoices.length}</strong></div>
      </Card>
      <Card><h2>Resumo do mês</h2><p className="muted">Receitas menos despesas, sem movimentos patrimoniais.</p>
        <strong className="template-highlight">{formatCentsBRL(report.netCents)}</strong>
        <p className="muted">Saldo operacional do período fictício, não saldo bancário.</p>
      </Card>
    </div>
    <Card><div className="section-heading"><div><h2>Fluxo de caixa</h2><p className="muted">Receitas e despesas por mês, com dados de exemplo.</p></div><button className="chart-demo-toggle" type="button" onClick={()=>setChartStatus(s=>s==='loading'?'success':'loading')}>{chartStatus==='loading'?'Exibir gráfico':'Simular loading do gráfico'}</button><button className="chart-demo-toggle" type="button" onClick={()=>setChartStatus('error')}>Simular erro do gráfico</button></div>
      <DataState kind="chart" chartKind="bars" label="Carregando fluxo de caixa" status={chartStatus}
        errorTitle="Erro ao carregar o fluxo de caixa"
        errorDescription="Não foi possível exibir os dados de exemplo."
        onRetry={()=>setChartStatus('success')}>
        <CashFlowChart data={demoCashFlow} formatValue={formatCentsBRL}/>
      </DataState>
    </Card>
    <TransactionsDemo/>
  </div>;
}
