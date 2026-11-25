import { useState } from 'react';
import { Button, Card, IncomeShareChart, StackedColumnChart } from '@personal-finance/ui';
import type { LedgerData } from '../ledger/contracts';
import { categoryIncomeMonth, categoryIncomeYear, type CategoryShare } from '../lib/category-income';
import { formatCentsBRL, formatCompetence, formatCompetenceAxis } from '../lib/demo-transactions';

/** D-085: despesas por categoria comparadas à receita — o mês escolhido ou doze meses (seis realizados, seis previstos). */
export function CategoryIncomeCard({ data, month, today }: { data: LedgerData; month: string; today: string }) {
  const [view, setView] = useState<'month' | 'year'>('month');
  const input = { transactions: data.transactions, categories: data.categories, fixedItems: data.fixedItems ?? [], fixedItemLinks: data.fixedItemLinks ?? [],
    budgets: data.budgets, installments: data.cardInstallments, savingsBoxes: data.savingsBoxes, savingsMovements: data.savingsMovements, today };
  const selected = categoryIncomeMonth(input, month);
  return <Card className="category-income">
    <div className="category-income__heading">
      <div><h2>Despesas por categoria x receita</h2>
        <p className="muted">{view === 'month'
          ? `${formatCompetence(month)}, ${selected.projected ? 'previsto pelo plano' : 'realizado'}: cada faixa é uma fatia da receita.`
          : 'Seis meses realizados e seis previstos, por categoria, contra a receita de cada mês.'}</p></div>
      <div className="budget-period-kind" role="group" aria-label="Visão do gráfico">
        <Button variant={view === 'month' ? 'secondary' : 'ghost'} size="sm" aria-pressed={view === 'month'} onClick={() => setView('month')}>Mês</Button>
        <Button variant={view === 'year' ? 'secondary' : 'ghost'} size="sm" aria-pressed={view === 'year'} onClick={() => setView('year')}>12 meses</Button>
      </div>
    </div>
    {view === 'month'
      ? <IncomeShareChart title={`Despesas por categoria x receita em ${formatCompetence(month)}`} incomeCents={selected.incomeCents}
        incomeLabel={selected.projected ? 'Receita prevista' : 'Receita'} segments={selected.shares} formatValue={formatCentsBRL} collapsibleDetails
        extraColumns={[
          { header: 'Fixos', cell: segment => (segment as CategoryShare).fixedCents ? formatCentsBRL((segment as CategoryShare).fixedCents) : '—' },
          { header: 'Meta', cell: segment => (segment as CategoryShare).metaCents !== undefined ? formatCentsBRL((segment as CategoryShare).metaCents!) : '—' }
        ]} />
      : (() => {
        const year = categoryIncomeYear(input);
        return <StackedColumnChart title="Despesas por categoria x receita em 12 meses" series={year.series} formatValue={formatCentsBRL} collapsibleDetails
          data={year.months.map(item => ({ label: formatCompetence(item.competence), axisLabel: formatCompetenceAxis(item.competence), values: item.values,
            referenceCents: item.incomeCents, projected: item.projected, current: item.current }))} />;
      })()}
  </Card>;
}
