import { useState } from 'react';
import { categoryBudgetProgress } from '@personal-finance/domain';
import { Badge, Button, Card, EmptyState, MetricCard, Select } from '@personal-finance/ui';
import { BudgetForm } from '../components/BudgetForm';
import type { LedgerState } from '../ledger/useLedger';
import { budgetPercent,budgetRemaining,demoBudgets } from '../lib/demo-finance';
import { formatCentsBRL } from '../lib/demo-transactions';

const currentPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

function formatPeriod(period: string) {
  if (period.length === 4) return `Ano ${period}`;
  const [year, month] = period.split('-').map(Number);
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatBasisPoints(value: number | bigint) {
  const basisPoints = BigInt(value);
  const decimals = basisPoints % 100n;
  return `${basisPoints / 100n}${decimals ? `,${decimals.toString().padStart(2, '0')}` : ''}%`;
}

function RealBudgets({ ledger }: { ledger: LedgerState }) {
  const [period, setPeriod] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const data = ledger.data;
  const months = Array.from(new Set((data?.transactions ?? []).map(row => row.competence))).sort().reverse();
  const years = Array.from(new Set(months.map(month => month.slice(0, 4)))).sort().reverse();
  const selectedPeriod = period || months[0] || currentPeriod();
  const periodOptions = [
    ...months.map(value => ({ value, label: formatPeriod(value) })),
    ...years.map(value => ({ value, label: formatPeriod(value) }))
  ];
  if (!periodOptions.some(option => option.value === selectedPeriod)) {
    periodOptions.unshift({ value: selectedPeriod, label: formatPeriod(selectedPeriod) });
  }

  const categories = new Map((data?.categories ?? []).map(category => [category.id, category.name]));
  const progress = (data?.budgets ?? []).map(budget => ({
    budget,
    category: categories.get(budget.categoryId) ?? 'Categoria indisponível',
    progress: categoryBudgetProgress(budget, data?.transactions ?? [], selectedPeriod)
  }));
  const income = progress[0]?.progress.incomeCents ?? (data?.transactions ?? [])
    .filter(row => row.reporting === 'income'
      && (row.classificationStatus === 'confirmed' || row.classificationStatus === 'automatic')
      && (selectedPeriod.length === 4 ? row.competence.startsWith(`${selectedPeriod}-`) : row.competence === selectedPeriod))
    .reduce((total, row) => total + row.amountCents, 0n);
  const totalLimit = progress.reduce((total, item) => total + item.progress.limitCents, 0n);
  const totalUsed = progress.reduce((total, item) => total + item.progress.usedCents, 0n);

  return <div className="template-page">
    <div className="template-heading"><div><p className="eyebrow">PLANEJAMENTO</p><h1>Orçamentos</h1>
      <p className="muted">Tetos por categoria calculados sobre toda receita confirmada do período.</p></div>
      <Button onClick={() => setFormOpen(true)}>Definir meta</Button></div>
    <div className="budget-toolbar">
      <Select label="Período" value={selectedPeriod} options={periodOptions} onChange={event => setPeriod(event.target.value)} />
      <Badge>{formatPeriod(selectedPeriod)}</Badge>
    </div>
    <div className="template-metrics" aria-label="Resumo das metas por categoria">
      <MetricCard label="Receita confirmada" value={formatCentsBRL(income)} tone="income" supportingText="Base para todos os tetos" />
      <MetricCard label="Tetos definidos" value={formatCentsBRL(totalLimit)} supportingText="Soma dos limites do período" />
      <MetricCard label="Gastos acompanhados" value={formatCentsBRL(totalUsed)} tone="expense" supportingText="Somente categorias com meta" />
    </div>
    {progress.length === 0
      ? <EmptyState title="Nenhuma meta definida" description="Defina um percentual para acompanhar o teto de uma categoria." action={<Button onClick={() => setFormOpen(true)}>Definir primeira meta</Button>} />
      : <div className="template-grid">{progress.map(({ budget, category, progress: item }) => {
        const status = item.status === 'exceeded' ? 'Acima do teto' : item.status === 'approaching' ? 'Próximo do teto' : 'Dentro do teto';
        const visualPercent = Number(item.usageBasisPoints > 10000n ? 10000n : item.usageBasisPoints) / 100;
        return <Card key={budget.id} className="budget-card">
          <div className="budget-card__top"><div><h2>{category}</h2><span className="muted">{formatBasisPoints(budget.percentageBasisPoints)} da receita</span></div>
            <Badge tone={item.status === 'exceeded' ? 'expense' : item.status === 'within' ? 'income' : 'neutral'}>{status}</Badge></div>
          <p className="muted">{formatCentsBRL(item.usedCents)} utilizados de {formatCentsBRL(item.limitCents)}</p>
          <progress className={`budget-progress ${item.status === 'exceeded' ? 'budget-progress--exceeded' : ''}`}
            max={100} value={visualPercent} aria-label={`Uso da meta de ${category}: ${formatBasisPoints(item.usageBasisPoints)}`} />
          <p className="budget-result">{item.remainingCents < 0n ? `Excedente: ${formatCentsBRL(-item.remainingCents)}` : `Disponível: ${formatCentsBRL(item.remainingCents)}`}</p>
        </Card>;
      })}</div>}
    <BudgetForm open={formOpen} onClose={() => setFormOpen(false)} ledger={ledger} />
  </div>;
}

export function BudgetsPage({ ledger }: { ledger?: LedgerState }) {
  if (ledger) return <RealBudgets ledger={ledger} />;
  const limit=demoBudgets.reduce((sum,item)=>sum+item.limitCents,0n);
  const used=demoBudgets.reduce((sum,item)=>sum+item.usedCents,0n);
  return <div className="template-page">
    <div className="template-heading"><div><p className="eyebrow">PLANEJAMENTO</p><h1>Orçamentos</h1>
      <p className="muted">Acompanhe limites e excedentes por categoria, usando valores fictícios.</p></div><Badge>Novembro 2026</Badge></div>
    <div className="template-metrics">
      <MetricCard label="Limite total fictício" value={formatCentsBRL(limit)}/>
      <MetricCard label="Consumo ilustrativo" value={formatCentsBRL(used)} tone="expense"/>
      <MetricCard label="Disponível agregado" value={formatCentsBRL(limit>used?limit-used:0n)}
        supportingText="Excedentes por categoria são exibidos separadamente"/>
    </div>
    <div className="template-grid">
      {demoBudgets.map(item=>{
        const remaining=budgetRemaining(item),exceeded=remaining<0n;
        const percent=budgetPercent(item);
        return <Card key={item.id} className="budget-card">
          <div className="budget-card__top"><h2>{item.category}</h2><Badge tone={exceeded?'expense':'neutral'}>{exceeded?'Acima do limite':'Dentro do limite'}</Badge></div>
          <p className="muted">{formatCentsBRL(item.usedCents)} utilizados de {formatCentsBRL(item.limitCents)}</p>
          <progress className={`budget-progress ${exceeded?'budget-progress--exceeded':''}`}
            max={100} value={Math.min(100,percent)}
            aria-label={`Uso do orçamento de ${item.category}: ${percent.toFixed(1).replace('.',',')}%`}/>
          <p className="budget-result">{exceeded? 'Excedente: '+formatCentsBRL(-remaining): 'Disponível: '+formatCentsBRL(remaining)}</p>
        </Card>;
      })}
    </div>
  </div>;
}
