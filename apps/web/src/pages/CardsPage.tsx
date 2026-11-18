import { useState } from 'react';
import { cardStatementSummary, type CardInstallment, type CardStatement, type FinancialAccount } from '@personal-finance/domain';
import { Badge, Button, Card, CardsIcon, DataState, DataTable, EmptyState, MetricCard, TransactionsIcon, type DataTableColumn } from '@personal-finance/ui';
import { demoInvoices, invoiceOpenCents, type DemoInvoice } from '../lib/demo-finance';
import { formatCentsBRL, formatCompetence, formatLocalDate } from '../lib/demo-transactions';
import type { LedgerState } from '../ledger/useLedger';
import { CreditCardForm } from '../components/CreditCardForm';
import { CardPaymentForm } from '../components/CardPaymentForm';
import type { PageProps } from './PageProps';

const statusLabels = { open: 'Em aberto', partial: 'Parcialmente paga', paid: 'Paga' } as const;
const demoColumns: DataTableColumn<DemoInvoice>[] = [
  { key: 'card', header: 'Cartão', headerIcon: CardsIcon, iconTone: 'warning', cell: item => <strong>{item.cardName}</strong> },
  { key: 'period', header: 'Competência', cell: item => item.period },
  { key: 'due', header: 'Vencimento', cell: item => formatLocalDate(item.dueDate) },
  { key: 'status', header: 'Status', cell: item => <Badge>{statusLabels[item.status]}</Badge> },
  { key: 'open', header: 'Valor pendente', align: 'end', cell: item => formatCentsBRL(invoiceOpenCents(item)) }
];

type StatementView = CardStatement & { cardName: string; openCents: bigint; status: keyof typeof statusLabels };

export function CardsPage({ ledger, headerAction }: PageProps) {
  const [selectedCard, setSelectedCard] = useState<FinancialAccount | null>(null);
  const [selectedStatement, setSelectedStatement] = useState<CardStatement | null>(null);
  if (ledger) {
    const data = ledger.data;
    const accounts = data?.accounts.filter(account => account.type === 'credit_card') ?? [];
    const accountById = new Map(accounts.map(account => [account.id, account]));
    const cardById = new Map((data?.creditCards ?? []).map(card => [card.id, card]));
    const statements: StatementView[] = (data?.cardStatements ?? []).map(statement => {
      const summary = cardStatementSummary(statement, data?.cardStatementEntries ?? [], data?.transactions ?? []);
      const card = cardById.get(statement.cardId);
      return { ...statement, cardName: accountById.get(card?.accountId ?? '')?.name ?? 'Cartão', openCents: summary.openCents, status: summary.status };
    });
    const projected = (data?.cardInstallments ?? []).filter(installment => installment.status === 'projected');
    const totalOpen = statements.reduce((sum, statement) => sum + statement.openCents, 0n);
    const totalProjected = projected.reduce((sum, installment) => sum + installment.amountCents, 0n);
    const cardColumns: DataTableColumn<FinancialAccount>[] = [
      { key: 'name', header: 'Cartão', headerIcon: CardsIcon, iconTone: 'warning', sortable: true, sortValue: account => account.name, cell: account => <strong>{account.name}</strong> },
      { key: 'calendar', header: 'Ciclo', sortable: true, sortValue: account => data?.creditCards.find(item => item.accountId === account.id)?.closingDay, cell: account => { const card = data?.creditCards.find(item => item.accountId === account.id); return card ? `Fecha dia ${card.closingDay} · vence dia ${card.dueDay}` : <Badge>Configuração pendente</Badge>; } },
      { key: 'limit', header: 'Limite', align: 'end', sortable: true, sortValue: account => data?.creditCards.find(item => item.accountId === account.id)?.creditLimitCents, cell: account => { const card = data?.creditCards.find(item => item.accountId === account.id); return card?.creditLimitCents === undefined ? 'Não informado' : formatCentsBRL(card.creditLimitCents); } },
      { key: 'action', header: 'Ação', align: 'end', cell: account => <Button variant="secondary" onClick={() => setSelectedCard(account)}>Configurar</Button> }
    ];
    const statementColumns: DataTableColumn<StatementView>[] = [
      { key: 'card', header: 'Cartão', headerIcon: CardsIcon, iconTone: 'warning', sortable: true, sortValue: statement => statement.cardName, cell: statement => <strong>{statement.cardName}</strong> },
      { key: 'competence', header: 'Competência', sortable: true, sortValue: statement => statement.competence, cell: statement => formatCompetence(statement.competence) },
      { key: 'due', header: 'Vencimento', sortable: true, sortValue: statement => statement.dueDate, cell: statement => formatLocalDate(statement.dueDate) },
      { key: 'status', header: 'Status', sortable: true, sortValue: statement => statusLabels[statement.status], cell: statement => <Badge>{statusLabels[statement.status]}</Badge> },
      { key: 'open', header: 'Pendente', align: 'end', sortable: true, sortValue: statement => statement.openCents, cell: statement => formatCentsBRL(statement.openCents) },
      { key: 'action', header: 'Ação', align: 'end', cell: statement => <Button variant="secondary" onClick={() => setSelectedStatement(statement)}>Vincular pagamento</Button> }
    ];
    const installmentColumns: DataTableColumn<CardInstallment>[] = [
      { key: 'description', header: 'Compra', headerIcon: TransactionsIcon, iconTone: 'expense', sortable: true, sortValue: item => item.description, cell: item => <strong>{item.description}</strong> },
      { key: 'number', header: 'Parcela', sortable: true, sortValue: item => item.number, cell: item => `${item.number}/${item.total}` },
      { key: 'competence', header: 'Fatura prevista', sortable: true, sortValue: item => item.dueCompetence, cell: item => formatCompetence(item.dueCompetence) },
      { key: 'amount', header: 'Valor', align: 'end', sortable: true, sortValue: item => item.amountCents, cell: item => formatCentsBRL(item.amountCents) }
    ];
    return <div className="template-page">
      <div className="template-heading"><div><p className="eyebrow">CRÉDITO</p><h1>Cartões e faturas</h1><p className="muted">Compras entram na competência do vencimento; pagamentos não viram uma nova despesa.</p></div><div className="template-heading__actions"><Badge>Livro financeiro</Badge>{headerAction}</div></div>
      <div className="template-metrics"><MetricCard label="Total pendente" value={formatCentsBRL(totalOpen)} supportingText="Compras menos estornos e pagamentos"/><MetricCard label="Parcelas futuras" value={formatCentsBRL(totalProjected)} supportingText="Previsão, fora do realizado"/><MetricCard label="Cartões configurados" value={`${data?.creditCards.length ?? 0} de ${accounts.length}`} supportingText="Fechamento e vencimento persistidos"/></div>
      <Card className="template-table-card"><DataState status={ledger.status === 'idle' ? 'loading' : ledger.status} kind="table" rows={3} columns={4} errorDescription={ledger.error} onRetry={() => void ledger.reload()}>
        {accounts.length ? <DataTable ariaLabel="Cartões cadastrados" columns={cardColumns} rows={accounts} getRowKey={account => account.id}/> : <EmptyState title="Nenhum cartão cadastrado" description="Cadastre uma conta do tipo cartão de crédito para começar."/>}
      </DataState></Card>
      <Card className="template-table-card">{statements.length ? <DataTable ariaLabel="Faturas dos cartões" columns={statementColumns} rows={statements} getRowKey={statement => statement.id}/> : <EmptyState title="Nenhuma fatura materializada" description="Faturas surgem quando compras de um cartão configurado são sincronizadas."/>}</Card>
      <Card className="template-table-card">{projected.length ? <DataTable ariaLabel="Parcelas futuras" columns={installmentColumns} rows={projected} getRowKey={installment => installment.id}/> : <EmptyState title="Nenhuma parcela futura" description="As projeções aparecerão aqui sem compor o gasto realizado."/>}</Card>
      <CreditCardForm account={selectedCard} onClose={() => setSelectedCard(null)} ledger={ledger}/>
      <CardPaymentForm statement={selectedStatement} onClose={() => setSelectedStatement(null)} ledger={ledger}/>
    </div>;
  }
  const billed = demoInvoices.reduce((sum, item) => sum + item.purchasesCents, 0n);
  const paid = demoInvoices.reduce((sum, item) => sum + item.paymentsCents, 0n);
  return <div className="template-page"><div className="template-heading"><div><p className="eyebrow">CRÉDITO</p><h1>Cartões e faturas</h1><p className="muted">Compras, pagamentos e faturas sem contabilizar o pagamento como novo consumo.</p></div><div className="template-heading__actions"><Badge>Dados fictícios</Badge>{headerAction}</div></div><div className="template-metrics"><MetricCard label="Compras faturadas" value={formatCentsBRL(billed)} supportingText="Exemplo de composição de faturas"/><MetricCard label="Pagamentos realizados" value={formatCentsBRL(paid)} supportingText="Liquidação patrimonial, não despesa"/><MetricCard label="Total pendente" value={formatCentsBRL(billed - paid)} supportingText="Valores ilustrativos"/></div><Card className="template-table-card"><DataTable ariaLabel="Faturas fictícias" columns={demoColumns} rows={demoInvoices} getRowKey={item => item.id}/></Card></div>;
}
