import { Badge, Card, MetricCard, CashFlowChart, DataState, type DataStatus } from '@personal-finance/ui';
import { useState } from 'react';
import { demoCashFlow } from '../lib/demo-charts';
import { TransactionsDemo } from '../components/TransactionsDemo';
import { accountsBalance, demoAccounts, demoBudgets, demoInvoices, invoiceOpenCents, monthlyReport } from '../lib/demo-finance';
import { demoTransactions, formatCentsBRL } from '../lib/demo-transactions';
import { accountBalance, ledgerTotals } from '@personal-finance/domain';
import type { LedgerState } from '../ledger/useLedger';

export function OverviewPage({ ledger }: { ledger?: LedgerState }) {
  const [chartStatus,setChartStatus]=useState<DataStatus>('success');
  if (ledger) {
    const data = ledger.data;
    const latestPeriod = data?.transactions.reduce((latest, row) => row.competence > latest ? row.competence : latest, '') ?? '';
    const periodRows = data?.transactions.filter(row => !latestPeriod || row.competence === latestPeriod) ?? [];
    const totals = ledgerTotals(periodRows);
    const balance = (data?.accounts ?? []).filter(account => account.type !== 'credit_card').reduce((sum, account) => sum + accountBalance(account, data?.transactions ?? []), 0n);
    const adjustments = periodRows.filter(row => row.nature === 'adjustment').length;
    return <div className="template-page">
      <div className="template-heading"><div><p className="eyebrow">PAINEL FINANCEIRO</p><h1>Visão geral</h1><p className="muted">Resumo derivado do livro financeiro, sem contar transferências como renda ou consumo.</p></div><Badge>{latestPeriod ? `${latestPeriod.slice(5)}/${latestPeriod.slice(0, 4)}` : 'Sem lançamentos'}</Badge></div>
      <div className="template-metrics" aria-label="Indicadores do livro financeiro">
        <MetricCard label="Patrimônio em contas" value={formatCentsBRL(balance)} supportingText="Saldo inicial mais movimentações" />
        <MetricCard label="Receitas do período" value={formatCentsBRL(totals.incomeCents)} tone="income" supportingText="Transferências excluídas" />
        <MetricCard label="Despesas do período" value={formatCentsBRL(totals.expenseCents)} tone="expense" supportingText="Consumo e ajustes" />
        <MetricCard label="Resultado do período" value={formatCentsBRL(totals.netCents)} supportingText="Receitas menos despesas" />
      </div>
      <div className="template-grid"><Card><h2>Livro financeiro</h2><div className="summary-row"><span>Contas cadastradas</span><strong>{data?.accounts.length ?? 0}</strong></div><div className="summary-row"><span>Lançamentos no período</span><strong>{periodRows.length}</strong></div><div className="summary-row"><span>Ajustes vinculados</span><strong>{adjustments}</strong></div></Card>
      <Card><h2>Resultado</h2><strong className="template-highlight">{formatCentsBRL(totals.netCents)}</strong><p className="muted">Movimentos patrimoniais permanecem neutros no resultado.</p></Card></div>
    </div>;
  }
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
