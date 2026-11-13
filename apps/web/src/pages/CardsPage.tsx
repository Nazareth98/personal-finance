import { accountBalance, type FinancialAccount } from '@personal-finance/domain';
import { Badge, Card, DataState, DataTable, EmptyState, MetricCard, type DataTableColumn } from '@personal-finance/ui';
import { demoInvoices, invoiceOpenCents, type DemoInvoice } from '../lib/demo-finance';
import { formatCentsBRL,formatLocalDate } from '../lib/demo-transactions';
import type { LedgerState } from '../ledger/useLedger';

const statusLabels: Record<DemoInvoice['status'],string>={open:'Em aberto',partial:'Parcialmente paga',paid:'Paga'};
const columns:DataTableColumn<DemoInvoice>[] = [
  {key:'card',header:'Cartão',cell:x=><strong>{x.cardName}</strong>},
  {key:'period',header:'Competência',cell:x=>x.period},
  {key:'due',header:'Vencimento',cell:x=>formatLocalDate(x.dueDate)},
  {key:'status',header:'Status',cell:x=><Badge>{statusLabels[x.status]}</Badge>},
  {key:'open',header:'Valor pendente',align:'end',cell:x=>formatCentsBRL(invoiceOpenCents(x))}
];
export function CardsPage({ ledger }: { ledger?: LedgerState }) {
  if (ledger) {
    const cards = ledger.data?.accounts.filter(account => account.type === 'credit_card') ?? [];
    const realColumns: DataTableColumn<FinancialAccount>[] = [
      { key: 'name', header: 'Cartão', cell: card => <strong>{card.name}</strong> },
      { key: 'balance', header: 'Saldo pelo livro', align: 'end', cell: card => formatCentsBRL(accountBalance(card, ledger.data?.transactions ?? [])) }
    ];
    const total = cards.reduce((sum, card) => sum + accountBalance(card, ledger.data?.transactions ?? []), 0n);
    return <div className="template-page">
      <div className="template-heading"><div><p className="eyebrow">CRÉDITO</p><h1>Cartões</h1><p className="muted">Base de cartões cadastrada no livro. Faturas e parcelas entram na Etapa 7.</p></div><Badge>Base financeira</Badge></div>
      <div className="template-metrics"><MetricCard label="Saldo dos cartões" value={formatCentsBRL(total)} supportingText="Ainda sem composição por fatura" /></div>
      <Card className="template-table-card"><DataState status={ledger.status === 'idle' ? 'loading' : ledger.status} kind="table" rows={3} columns={2} errorDescription={ledger.error} onRetry={() => void ledger.reload()}>
        {cards.length ? <DataTable ariaLabel="Cartões cadastrados" columns={realColumns} rows={cards} getRowKey={card => card.id} /> : <EmptyState title="Nenhum cartão cadastrado" description="Cadastre um cartão na tela Contas para preparar a integração futura." />}
      </DataState></Card>
    </div>;
  }
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
