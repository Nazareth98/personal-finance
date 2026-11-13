import { Badge, Card, MetricCard, CashFlowChart, TrendLineChart, CategoryDonutChart } from '@personal-finance/ui';
import { monthlyReport } from '../lib/demo-finance';
import { demoTransactions,formatCentsBRL } from '../lib/demo-transactions';
import {demoCashFlow,demoNetTrend,demoExpenseSlices} from '../lib/demo-charts';
export function ReportsPage() {
  const totals=monthlyReport(demoTransactions);
  return <div className="template-page">
    <div className="template-heading"><div><p className="eyebrow">ANÁLISE</p><h1>Relatórios</h1>
      <p className="muted">Composição de despesas e resultado do período com dados de demonstração.</p></div><Badge>Novembro 2026</Badge></div>
    <div className="template-metrics">
      <MetricCard label="Receitas" value={formatCentsBRL(totals.incomeCents)} tone="income" supportingText="Entradas fictícias"/>
      <MetricCard label="Despesas" value={formatCentsBRL(totals.expenseCents)} tone="expense" supportingText="Consumo fictício"/>
      <MetricCard label="Resultado" value={formatCentsBRL(totals.netCents)} valueTone={totals.netCents<0n?'negative':totals.netCents>0n?'positive':'neutral'} supportingText="Exclui transferências próprias"/>
    </div>
    <div className="template-chart-grid">
      <Card><h2>Fluxo de caixa por mês</h2><p className="muted">Receitas e despesas ilustrativas de seis meses.</p>
        <CashFlowChart data={demoCashFlow} formatValue={formatCentsBRL}/>
      </Card>
      <Card><h2>Evolução do resultado acumulado</h2><p className="muted">Saldo acumulado demonstrativo, sem transferências internas.</p>
        <TrendLineChart data={demoNetTrend} formatValue={formatCentsBRL}/>
      </Card>
    </div>
    <Card><h2>Distribuição de despesas</h2><p className="muted">Participação por categoria, com valores e percentuais.</p>
      <CategoryDonutChart data={demoExpenseSlices} formatValue={formatCentsBRL}/>
    </Card>
  </div>;
}
