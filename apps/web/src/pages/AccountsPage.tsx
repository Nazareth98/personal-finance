import { Badge, Card, DataTable, MetricCard, type DataTableColumn } from '@personal-finance/ui';
import { accountsBalance, demoAccounts, type DemoAccount } from '../lib/demo-finance';
import { formatCentsBRL } from '../lib/demo-transactions';
const types: Record<DemoAccount['type'], string> = { checking:'Conta corrente', savings:'Reserva', investment:'Investimento' };
const columns:DataTableColumn<DemoAccount>[] = [
  {key:'name',header:'Conta',cell:a=><strong>{a.name}</strong>},
  {key:'type',header:'Tipo',cell:a=><Badge>{types[a.type]}</Badge>},
  {key:'balance',header:'Saldo demonstrativo',align:'end',cell:a=>formatCentsBRL(a.balanceCents)}
];
export function AccountsPage() {
  return <div className="template-page">
    <div className="template-heading"><div><p className="eyebrow">PATRIMÔNIO</p><h1>Contas</h1>
      <p className="muted">Visão separada dos saldos ilustrativos; transferências internas não são receita.</p></div><Badge>3 contas fictícias</Badge></div>
    <div className="template-metrics"><MetricCard label="Saldo total ilustrativo" value={formatCentsBRL(accountsBalance(demoAccounts))}
      supportingText="Agrega apenas os saldos demonstrativos"/></div>
    <Card className="template-table-card"><DataTable ariaLabel="Contas de demonstração"
      columns={columns} rows={demoAccounts} getRowKey={a=>a.id}/></Card>
  </div>;
}
