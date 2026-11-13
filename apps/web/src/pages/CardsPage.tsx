import { Badge, Card, DataTable, MetricCard, type DataTableColumn } from '@personal-finance/ui';
import { demoInvoices, invoiceOpenCents, type DemoInvoice } from '../lib/demo-finance';
import { formatCentsBRL,formatLocalDate } from '../lib/demo-transactions';

const statusLabels: Record<DemoInvoice['status'],string>={open:'Em aberto',partial:'Parcialmente paga',paid:'Paga'};
const columns:DataTableColumn<DemoInvoice>[] = [
  {key:'card',header:'Cartão',cell:x=><strong>{x.cardName}</strong>},
  {key:'period',header:'Competência',cell:x=>x.period},
  {key:'due',header:'Vencimento',cell:x=>formatLocalDate(x.dueDate)},
  {key:'status',header:'Status',cell:x=><Badge>{statusLabels[x.status]}</Badge>},
  {key:'open',header:'Valor pendente',align:'end',cell:x=>formatCentsBRL(invoiceOpenCents(x))}
];
export function CardsPage() {
  const billed=demoInvoices.reduce((sum,i)=>sum+i.purchasesCents,0n);
  const paid=demoInvoices.reduce((sum,i)=>sum+i.paymentsCents,0n);
  return <div className="template-page">
    <div className="template-heading"><div><p className="eyebrow">CRÉDITO</p><h1>Cartões e faturas</h1>
      <p className="muted">Compras, pagamentos e faturas sem contabilizar o pagamento como novo consumo.</p></div><Badge>Dados fictícios</Badge></div>
    <div className="template-metrics">
      <MetricCard label="Compras faturadas" value={formatCentsBRL(billed)} supportingText="Exemplo de composição de faturas"/>
      <MetricCard label="Pagamentos realizados" value={formatCentsBRL(paid)} supportingText="Liquidação patrimonial, não despesa"/>
      <MetricCard label="Total pendente" value={formatCentsBRL(billed-paid)} supportingText="Valores ilustrativos"/>
    </div>
    <Card className="template-table-card"><DataTable ariaLabel="Faturas fictícias" columns={columns}
      rows={demoInvoices} getRowKey={x=>x.id}/></Card>
  </div>;
}
