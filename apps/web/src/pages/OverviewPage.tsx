import { Badge, Card, MetricCard, CashFlowChart, DataState, type DataStatus } from '@personal-finance/ui';
import { useState } from 'react';
import { demoCashFlow } from '../lib/demo-charts';
import { TransactionsDemo } from '../components/TransactionsDemo';
import { accountsBalance, demoAccounts, demoBudgets, demoInvoices, invoiceOpenCents, monthlyReport } from '../lib/demo-finance';
import { demoTransactions, formatCentsBRL } from '../lib/demo-transactions';

export function OverviewPage() {
  const [chartStatus,setChartStatus]=useState<DataStatus>('success');
  const report = monthlyReport(demoTransactions);
  const openInvoices = demoInvoices.reduce((sum, row) => sum + invoiceOpenCents(row), 0n);
  const budgetWarnings = demoBudgets.filter(row => row.usedCents > row.limitCents).length;
  return <div className="template-page">
    <div className="template-heading">
      <div><p className="eyebrow">PAINEL FINANCEIRO</p><h1>Visão geral</h1><p className="muted">Um resumo ilustrativo de contas, movimentações e compromissos.</p></div>
      <Badge>Novembro 2026 · Demo</Badge>
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
