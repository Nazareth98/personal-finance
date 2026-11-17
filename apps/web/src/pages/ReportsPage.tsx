import { Badge, Card, MetricCard, CashFlowChart, TrendLineChart, CategoryDonutChart, DataTable, ReportsIcon, type DataTableColumn } from '@personal-finance/ui';
import { monthlyReport } from '../lib/demo-finance';
import { demoTransactions,formatCentsBRL } from '../lib/demo-transactions';
import {demoCashFlow,demoNetTrend,demoExpenseSlices} from '../lib/demo-charts';
import { addCompetenceMonths, buildSixMonthForecast, ledgerTotals, type ForecastMonth } from '@personal-finance/domain';
import type { LedgerState } from '../ledger/useLedger';
import type { PageProps } from './PageProps';

function nextCompetence(transactions: NonNullable<LedgerState['data']>['transactions']): string {
  const latest = transactions.reduce((value, row) => row.competence > value ? row.competence : value, '');
  if (latest) return addCompetenceMonths(latest, 1);
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

const forecastColumns: DataTableColumn<ForecastMonth>[] = [
  { key: 'competence', header: 'Competência', headerIcon: ReportsIcon, iconTone: 'transfer', cell: row => row.competence },
  { key: 'income', header: 'Receita recorrente', align: 'end', cell: row => formatCentsBRL(row.recurringIncomeCents) },
  { key: 'spending', header: 'Gastos planejados', align: 'end', cell: row => formatCentsBRL(row.plannedSpendingCents) },
  { key: 'installments', header: 'Parcelas', align: 'end', cell: row => formatCentsBRL(row.installmentCents) },
  { key: 'savings', header: 'Aportes', align: 'end', cell: row => formatCentsBRL(row.plannedSavingsCents) },
  { key: 'net', header: 'Resultado previsto', align: 'end', cell: row => <strong>{formatCentsBRL(row.netCents)}</strong> }
];

export function ReportsPage({ ledger, headerAction }: PageProps) {
  if (ledger) {
    const data = ledger.data;
    const rows = data?.transactions ?? [];
    const totals = ledgerTotals(rows);
    const periods = new Set(rows.map(row => row.competence));
    const startCompetence = nextCompetence(rows);
    const forecast = buildSixMonthForecast({ transactions: rows, budgets: data?.budgets ?? [], installments: data?.cardInstallments ?? [],
      savingsBoxes: data?.savingsBoxes ?? [], savingsMovements: data?.savingsMovements ?? [], startCompetence });
    const extraordinaryIncome = rows.filter(row => row.reporting === 'income' && row.categoryId === 'extraordinary_income')
      .reduce((sum, row) => sum + row.amountCents, 0n);
    const first = forecast[0];
    return <div className="template-page">
      <div className="template-heading"><div><p className="eyebrow">ANÁLISE</p><h1>Relatórios</h1><p className="muted">Realizado completo e seis meses futuros baseados somente em receitas recorrentes.</p></div><div className="template-heading__actions"><Badge>{periods.size} período(s)</Badge>{headerAction}</div></div>
      <div className="template-metrics"><MetricCard label="Receitas realizadas" value={formatCentsBRL(totals.incomeCents)} tone="income" supportingText="Inclui receitas extraordinárias"/><MetricCard label="Receita recorrente média" value={formatCentsBRL(first?.recurringIncomeCents ?? 0n)} tone="income" supportingText="Média dos seis meses anteriores"/><MetricCard label="Receita extraordinária" value={formatCentsBRL(extraordinaryIncome)} supportingText="Permanece fora da previsão"/><MetricCard label="Próximo resultado previsto" value={formatCentsBRL(first?.netCents ?? 0n)} valueTone={(first?.netCents ?? 0n) < 0n ? 'negative' : 'positive'} supportingText={startCompetence}/></div>
      <Card className="template-table-card"><div className="template-table-card__header"><h2>Previsão de seis meses</h2><p className="muted">Gastos planejados usam o maior valor entre a média recorrente observada e os tetos definidos; parcelas e aportes são somados separadamente.</p></div><DataTable ariaLabel="Previsão financeira de seis meses" columns={forecastColumns} rows={forecast} getRowKey={row => row.competence}/></Card>
      <Card><h2>Critérios da previsão</h2><p className="muted">Receitas extraordinárias alteram o realizado e os tetos do mês em que ocorreram, mas nunca a média futura. Despesas recorrentes exigem ocorrência em pelo menos duas das seis competências anteriores.</p></Card>
    </div>;
  }
  const totals=monthlyReport(demoTransactions);
  return <div className="template-page">
    <div className="template-heading"><div><p className="eyebrow">ANÁLISE</p><h1>Relatórios</h1>
      <p className="muted">Composição de despesas e resultado do período com dados de demonstração.</p></div><div className="template-heading__actions"><Badge>Novembro 2026</Badge>{headerAction}</div></div>
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
