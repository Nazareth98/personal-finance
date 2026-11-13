import { Badge, Card, MetricCard } from '@personal-finance/ui';
import { monthlyReport } from '../lib/demo-finance';
import { demoTransactions,formatCentsBRL } from '../lib/demo-transactions';
type ReportBucket = { label:string; amountCents:bigint; };
export function ReportsPage() {
  const totals=monthlyReport(demoTransactions);
  const byCategory=demoTransactions.filter(x=>x.kind==='expense').reduce<Record<string,bigint>>((acc,row)=>{
    acc[row.category]=(acc[row.category]??0n)+row.amountCents;return acc;
  },{});
  const buckets:ReportBucket[]=Object.entries(byCategory)
    .map(([label,amountCents])=>({label,amountCents}))
    .sort((a,b)=>a.amountCents===b.amountCents? a.label.localeCompare(b.label,'pt-BR') : a.amountCents>b.amountCents?-1:1);
  return <div className="template-page">
    <div className="template-heading"><div><p className="eyebrow">ANÁLISE</p><h1>Relatórios</h1>
      <p className="muted">Composição de despesas e resultado do período com dados de demonstração.</p></div><Badge>Novembro 2026</Badge></div>
    <div className="template-metrics">
      <MetricCard label="Receitas" value={formatCentsBRL(totals.incomeCents)} tone="income" supportingText="Entradas fictícias"/>
      <MetricCard label="Despesas" value={formatCentsBRL(totals.expenseCents)} tone="expense" supportingText="Consumo fictício"/>
      <MetricCard label="Resultado" value={formatCentsBRL(totals.netCents)} supportingText="Exclui transferências próprias"/>
    </div>
    <Card><h2>Despesas por categoria</h2><p className="muted">Comparação proporcional do consumo demonstrativo por categoria.</p>
      <div className="report-bars">{buckets.map(b=>{
        // Percentual limitado à visualização; os valores monetários permanecem bigint.
        const portion=totals.expenseCents>0n?Number(b.amountCents*10000n/totals.expenseCents)/100:0;
        return <div key={b.label} className="report-row">
          <div className="report-row__top"><strong>{b.label}</strong><span>{formatCentsBRL(b.amountCents)} · {portion.toFixed(1).replace('.',',')}%</span></div>
          <progress className="report-progress" max={100} value={portion} aria-label={`${b.label}: ${portion.toFixed(1).replace('.',',')}% das despesas`}/>
        </div>;
      })}</div>
    </Card>
  </div>;
}
