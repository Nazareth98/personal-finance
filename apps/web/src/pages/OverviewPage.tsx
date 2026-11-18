import { Badge, Button, Card, MetricCard, CashFlowChart, DataState, Icon, NextIcon, PreviousIcon, type DataStatus } from '@personal-finance/ui';
import { useHashParams } from '../hooks/useHashParams';
import { useState } from 'react';
import { demoCashFlow } from '../lib/demo-charts';
import { TransactionsDemo } from '../components/TransactionsDemo';
import { accountsBalance, demoAccounts, demoBudgets, demoInvoices, invoiceOpenCents, monthlyReport } from '../lib/demo-finance';
import { demoTransactions, formatCentsBRL, formatCompetence } from '../lib/demo-transactions';
import { accountBalance, addCompetenceMonths, ledgerTotals } from '@personal-finance/domain';
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

export function OverviewPage({ ledger, headerAction }: PageProps) {
  const [chartStatus,setChartStatus]=useState<DataStatus>('success');
  const [params, setParams] = useHashParams();
  if (ledger) {
    const data = ledger.data;
    const latestPeriod = data?.transactions.reduce((latest, row) => row.competence > latest ? row.competence : latest, '') ?? '';
    const requested = params.get('period') ?? '';
    const period = /^\d{4}-(0[1-9]|1[0-2])$/.test(requested) ? requested : latestPeriod || currentCompetence();
    const periodRows = data?.transactions.filter(row => row.competence === period) ?? [];
    const totals = ledgerTotals(periodRows);
    // Patrimônio ao fim do período: lançamentos de competências futuras ainda não aconteceram.
    const rowsUntilPeriod = data?.transactions.filter(row => row.competence <= period) ?? [];
    const balance = (data?.accounts ?? []).filter(account => account.type !== 'credit_card').reduce((sum, account) => sum + accountBalance(account, rowsUntilPeriod), 0n);
    const adjustments = periodRows.filter(row => row.nature === 'adjustment').length;
    return <div className="template-page">
      <div className="template-heading"><div><p className="eyebrow">PAINEL FINANCEIRO</p><h1>Visão geral</h1><p className="muted">Resumo derivado do livro financeiro, sem contar transferências como renda ou consumo.</p></div><div className="template-heading__actions"><PeriodNavigator period={period} onChange={next => setParams({ period: next })} />{headerAction}</div></div>
      <div className="template-metrics" aria-label="Indicadores do livro financeiro">
        <MetricCard label="Patrimônio em contas" value={formatCentsBRL(balance)} supportingText={`Saldo ao fim de ${formatCompetence(period)}`} />
        <MetricCard label="Receitas do período" value={formatCentsBRL(totals.incomeCents)} tone="income" supportingText="Transferências excluídas" />
        <MetricCard label="Despesas do período" value={formatCentsBRL(totals.expenseCents)} tone="expense" supportingText="Consumo e ajustes" />
        <MetricCard label="Resultado do período" value={formatCentsBRL(totals.netCents)} supportingText="Receitas menos despesas" />
      </div>
      <div className="template-grid"><Card><h2>Livro financeiro</h2><div className="summary-row"><span>Contas cadastradas</span><strong>{data?.accounts.length ?? 0}</strong></div><div className="summary-row"><a href={`#transactions?period=${period}`}>Lançamentos no período</a><strong>{periodRows.length}</strong></div><div className="summary-row"><span>Ajustes vinculados</span><strong>{adjustments}</strong></div></Card>
      <Card><h2>Resultado</h2><strong className="template-highlight">{formatCentsBRL(totals.netCents)}</strong><p className="muted">Movimentos patrimoniais permanecem neutros no resultado.</p></Card></div>
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
      <MetricCard label="Patrimônio em contas" value={formatCentsBRL(accountsBalance(demoAccounts))} supportingText="Saldos demonstrativos; não é fluxo mensal"/>
      <MetricCard label="Receitas do período" value={formatCentsBRL(report.incomeCents)} valueTone="positive" supportingText="Exclui transferências próprias" tone="income"/>
      <MetricCard label="Despesas do período" value={formatCentsBRL(report.expenseCents)} valueTone="negative" supportingText="Consumo demonstrativo" tone="expense"/>
      <MetricCard label="Faturas em aberto" value={formatCentsBRL(openInvoices)} supportingText="Obrigação separada do consumo"/>
    </div>
    <div className="template-grid">
      <Card><h2>Acompanhamento</h2><p className="muted">Alertas de exemplo para orientar as próximas decisões.</p>
        <div className="summary-row"><span>Orçamentos acima do limite</span><strong>{budgetWarnings}</strong></div>
        <div className="summary-row"><span>Contas acompanhadas</span><strong>{demoAccounts.length}</strong></div>
        <div className="summary-row"><span>Faturas demonstrativas</span><strong>{demoInvoices.length}</strong></div>
      </Card>
      <Card><h2>Resumo do mês</h2><p className="muted">Receitas menos despesas, sem movimentos patrimoniais.</p>
        <strong className="template-highlight">{formatCentsBRL(report.netCents)}</strong>
        <p className="muted">Saldo operacional do período fictício, não saldo bancário.</p>
      </Card>
    </div>
    <Card><div className="section-heading"><div><h2>Fluxo de caixa</h2><p className="muted">Comparativo mensal demonstrativo de receitas e despesas.</p></div><button className="chart-demo-toggle" type="button" onClick={()=>setChartStatus(s=>s==='loading'?'success':'loading')}>{chartStatus==='loading'?'Exibir gráfico':'Simular loading do gráfico'}</button><button className="chart-demo-toggle" type="button" onClick={()=>setChartStatus('error')}>Simular erro do gráfico</button></div>
      <DataState kind="chart" chartKind="bars" label="Carregando fluxo de caixa" status={chartStatus}
        errorTitle="Erro ao carregar o fluxo de caixa"
        errorDescription="Não foi possível exibir os dados demonstrativos."
        onRetry={()=>setChartStatus('success')}>
        <CashFlowChart data={demoCashFlow} formatValue={formatCentsBRL}/>
      </DataState>
    </Card>
    <TransactionsDemo/>
  </div>;
}
