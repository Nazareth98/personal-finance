import { Badge, Card, MetricCard } from '@personal-finance/ui';
import { budgetPercent,budgetRemaining,demoBudgets } from '../lib/demo-finance';
import { formatCentsBRL } from '../lib/demo-transactions';

export function BudgetsPage() {
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
