import { useState } from 'react';
import { Badge, Button, Card, MetricCard, CashFlowChart, TrendLineChart, CategoryDonutChart, DataTable, DivergingColumnChart, FinancialValue, Icon, NextIcon, PreviousIcon, ReportsIcon, type DataTableColumn } from '@personal-finance/ui';
import { monthlyReport } from '../lib/demo-finance';
import { demoTransactions,formatCentsBRL,formatCompetence } from '../lib/demo-transactions';
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
  { mobile: 'primary', key: 'competence', header: 'Competência', headerIcon: ReportsIcon, iconTone: 'transfer', sortable: true, sortValue: row => row.competence, cell: row => formatCompetence(row.competence) },
  { mobile: 'field', key: 'income', header: 'Receita recorrente', align: 'end', sortable: true, sortValue: row => row.recurringIncomeCents, cell: row => formatCentsBRL(row.recurringIncomeCents) },
  { mobile: 'field', key: 'spending', header: 'Gastos planejados', align: 'end', sortable: true, sortValue: row => row.plannedSpendingCents, cell: row => formatCentsBRL(row.plannedSpendingCents) },
  { mobile: 'field', key: 'installments', header: 'Parcelas', align: 'end', sortable: true, sortValue: row => row.installmentCents, cell: row => formatCentsBRL(row.installmentCents) },
  { mobile: 'field', key: 'savings', header: 'Aportes', align: 'end', sortable: true, sortValue: row => row.plannedSavingsCents, cell: row => formatCentsBRL(row.plannedSavingsCents) },
  { mobile: 'value', key: 'net', header: 'Resultado previsto', align: 'end', sortable: true, sortValue: row => row.netCents, cell: row => <strong><FinancialValue value={formatCentsBRL(row.netCents)}
    tone={row.netCents < 0n ? 'negative' : row.netCents > 0n ? 'positive' : 'neutral'} /></strong> }
];

const signed = (cents: bigint) => cents < 0n ? `− ${formatCentsBRL(-cents)}` : cents > 0n ? `+ ${formatCentsBRL(cents)}` : formatCentsBRL(0n);
const axisMonth = (competence: string) => formatCompetence(competence).split('/')[0]!;

function ForecastReport({ forecast, extraordinaryIncome, realizedIncome, periodCount, headerAction }: {
  forecast: ForecastMonth[]; extraordinaryIncome: bigint; realizedIncome: bigint; periodCount: number; headerAction: PageProps['headerAction'];
}) {
  const [selected, setSelected] = useState(0);
  const first = forecast[0];
  const month = forecast[Math.min(selected, forecast.length - 1)];
  const totalNet = forecast.reduce((sum, row) => sum + row.netCents, 0n);
  const negative = forecast.filter(row => row.netCents < 0n);
  const tight = month && month.netCents >= 0n && month.recurringIncomeCents > 0n && month.netCents * 100n < month.recurringIncomeCents * 5n;
  return <div className="template-page">
    <div className="template-heading"><div><p className="eyebrow">ANÁLISE</p><h1>Relatórios</h1>
      <p className="muted">Uma estimativa dos próximos seis meses, com base no que se repete todo mês. Entradas fora do comum não entram.</p></div>
      <div className="template-heading__actions">{headerAction}</div></div>
    <section className="summary-strip" aria-label="Resumo da previsão">
      <div><span className="muted">Receita recorrente média</span><strong className="transaction-amount--income">{signed(first?.recurringIncomeCents ?? 0n)}</strong>
        <span className="muted">Fora da média: <strong>{formatCentsBRL(extraordinaryIncome)}</strong> extraordinárias</span></div>
      <div><span className="muted">Gastos planejados por mês</span><strong>{signed(-(first?.plannedSpendingCents ?? 0n))}</strong><span className="muted">Maior entre média e tetos</span></div>
      <div><span className="muted">Resultado em 6 meses</span><strong className={totalNet < 0n ? 'transaction-amount--expense' : 'transaction-amount--income'}>{signed(totalNet)}</strong>
        <span className="muted">{forecast.length ? `${formatCompetence(forecast[0]!.competence)} a ${formatCompetence(forecast[forecast.length - 1]!.competence)}` : 'Sem previsão'}</span></div>
      <div><span className="muted">Meses no vermelho</span><strong className={negative.length ? 'status-tone--approaching' : undefined}>{negative.length}</strong>
        <span className={negative.length ? 'status-tone--approaching' : 'muted'}>{negative.length ? `${formatCompetence(negative[0]!.competence)}: ${signed(negative[0]!.netCents)}` : 'Nenhum previsto'}</span></div>
    </section>
    <div className="report-grid">
      <Card><div className="chart-card__heading"><h2>Resultado previsto por mês</h2></div>
        <p className="muted">Receita recorrente menos gastos planejados, parcelas e aportes. Realizado até agora: {signed(realizedIncome)} em {periodCount} período(s).</p>
        <DivergingColumnChart title="Resultado previsto por mês" formatValue={signed} positiveLabel="Sobra" negativeLabel="Falta" collapsibleDetails
          data={forecast.map(row => ({ label: formatCompetence(row.competence), axisLabel: axisMonth(row.competence), valueCents: row.netCents }))} />
      </Card>
      {month && <Card className="report-composition">
        <div className="report-composition__heading"><h2>Composição de {formatCompetence(month.competence)}</h2>
          <div className="period-navigator" role="group" aria-label="Mês da composição">
            <Button variant="ghost" size="sm" aria-label="Mês anterior" disabled={selected === 0} onClick={() => setSelected(value => value - 1)}><Icon icon={PreviousIcon} size="sm" /></Button>
            <Button variant="ghost" size="sm" aria-label="Próximo mês" disabled={selected >= forecast.length - 1} onClick={() => setSelected(value => value + 1)}><Icon icon={NextIcon} size="sm" /></Button>
          </div></div>
        <dl className="report-composition__rows">
          <div><dt>Receita recorrente</dt><dd className="transaction-amount--income">{signed(month.recurringIncomeCents)}</dd></div>
          <div><dt>Gastos planejados</dt><dd>{signed(-month.plannedSpendingCents)}</dd></div>
          <div><dt>Parcelas de cartão</dt><dd>{signed(-month.installmentCents)}</dd></div>
          <div><dt>Aportes das caixinhas</dt><dd>{signed(-month.plannedSavingsCents)}</dd></div>
          <div className="report-composition__total"><dt>Resultado previsto</dt><dd className={month.netCents < 0n ? 'transaction-amount--expense' : 'transaction-amount--income'}>{signed(month.netCents)}</dd></div>
        </dl>
        {month.netCents < 0n
          ? <p className="status-tone--approaching report-composition__note">Falta {formatCentsBRL(-month.netCents)} neste mês. Revise tetos, parcelas ou aportes.</p>
          : tight ? <p className="status-tone--approaching report-composition__note">Margem apertada: menos de 5% da receita recorrente.</p> : null}
        <a href="#budgets">Ajustar tetos em Orçamentos</a>
      </Card>}
    </div>
    <Card className="template-table-card"><div className="template-table-card__header"><h2>Tabela da previsão</h2><p className="muted">Os mesmos valores do gráfico, mês a mês.</p></div>
      <DataTable ariaLabel="Previsão financeira de seis meses" columns={forecastColumns} rows={forecast} getRowKey={row => row.competence}/></Card>
    <details className="ui-card report-criteria"><summary>Como a previsão é calculada</summary>
      <p className="muted">Receitas extraordinárias alteram o realizado e os tetos do mês em que ocorreram, mas nunca a média futura. Despesas recorrentes exigem ocorrência em pelo menos duas das seis competências anteriores. Gastos planejados usam o maior valor entre essa média e os tetos definidos; parcelas e aportes são somados separadamente.</p>
    </details>
  </div>;
}

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
    return <ForecastReport forecast={forecast} extraordinaryIncome={extraordinaryIncome} realizedIncome={totals.incomeCents} periodCount={periods.size} headerAction={headerAction} />;
  }
  const totals=monthlyReport(demoTransactions);
  return <div className="template-page">
    <div className="template-heading"><div><p className="eyebrow">ANÁLISE</p><h1>Relatórios</h1>
      <p className="muted">Para onde foi o dinheiro e o resultado do mês, com dados de exemplo.</p></div><div className="template-heading__actions"><Badge>Novembro 2026</Badge>{headerAction}</div></div>
    <div className="template-metrics">
      <MetricCard label="Receitas" value={formatCentsBRL(totals.incomeCents)} tone="income" supportingText="Entradas fictícias"/>
      <MetricCard label="Despesas" value={formatCentsBRL(totals.expenseCents)} tone="expense" supportingText="Consumo fictício"/>
      <MetricCard label="Resultado" value={formatCentsBRL(totals.netCents)} valueTone={totals.netCents<0n?'negative':totals.netCents>0n?'positive':'neutral'} supportingText="Exclui transferências próprias"/>
    </div>
    <div className="template-chart-grid">
      <Card><h2>Fluxo de caixa por mês</h2><p className="muted">Receitas e despesas ilustrativas de seis meses.</p>
        <CashFlowChart data={demoCashFlow} formatValue={formatCentsBRL}/>
      </Card>
      <Card><h2>Evolução do resultado acumulado</h2><p className="muted">Saldo acumulado de exemplo, sem transferências entre contas.</p>
        <TrendLineChart data={demoNetTrend} formatValue={formatCentsBRL}/>
      </Card>
    </div>
    <Card><h2>Distribuição de despesas</h2><p className="muted">Participação por categoria, com valores e percentuais.</p>
      <CategoryDonutChart data={demoExpenseSlices} formatValue={formatCentsBRL}/>
    </Card>
  </div>;
}
