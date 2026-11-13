import { useState } from 'react';
import { accountBalance, type FinancialAccount } from '@personal-finance/domain';
import { Badge, Button, Card, DataState, DataTable, EmptyState, Icon, MetricCard, PlusIcon, type DataTableColumn } from '@personal-finance/ui';
import { accountsBalance, demoAccounts, type DemoAccount } from '../lib/demo-finance';
import { formatCentsBRL } from '../lib/demo-transactions';
import type { LedgerState } from '../ledger/useLedger';
import { AccountForm } from '../components/AccountForm';
const types: Record<DemoAccount['type'], string> = { checking:'Conta corrente', savings:'Reserva', investment:'Investimento' };
const columns:DataTableColumn<DemoAccount>[] = [
  {key:'name',header:'Conta',cell:a=><strong>{a.name}</strong>},
  {key:'type',header:'Tipo',cell:a=><Badge>{types[a.type]}</Badge>},
  {key:'balance',header:'Saldo demonstrativo',align:'end',cell:a=>formatCentsBRL(a.balanceCents)}
];
export function AccountsPage({ ledger }: { ledger?: LedgerState }) {
  const [formOpen, setFormOpen] = useState(false);
  if (ledger) {
    const rows = ledger.data?.accounts ?? [];
    const realColumns: DataTableColumn<FinancialAccount>[] = [
      { key: 'name', header: 'Conta', cell: account => <strong>{account.name}</strong> },
      { key: 'type', header: 'Tipo', cell: account => <Badge>{({ checking: 'Conta corrente', savings: 'Reserva', investment: 'Investimento', credit_card: 'Cartão de crédito' })[account.type]}</Badge> },
      { key: 'balance', header: 'Saldo pelo livro', align: 'end', cell: account => formatCentsBRL(accountBalance(account, ledger.data?.transactions ?? [])) }
    ];
    const total = rows.filter(account => account.type !== 'credit_card').reduce((sum, account) => sum + accountBalance(account, ledger.data?.transactions ?? []), 0n);
    return <div className="template-page">
      <div className="template-heading"><div><p className="eyebrow">PATRIMÔNIO</p><h1>Contas</h1><p className="muted">Saldos reconstruídos pelo saldo inicial e pelos lançamentos.</p></div><Button onClick={() => setFormOpen(true)}><Icon icon={PlusIcon} size="sm"/>Nova conta</Button></div>
      <div className="template-metrics"><MetricCard label="Saldo total em contas" value={formatCentsBRL(total)} supportingText="Cartões não compõem o patrimônio disponível" /></div>
      <Card className="template-table-card"><DataState status={ledger.status === 'idle' ? 'loading' : ledger.status} kind="table" rows={4} columns={3} errorDescription={ledger.error} onRetry={() => void ledger.reload()}>
        {rows.length ? <DataTable ariaLabel="Contas financeiras" columns={realColumns} rows={rows} getRowKey={account => account.id} /> : <EmptyState title="Nenhuma conta cadastrada" description="Cadastre a primeira conta para iniciar o livro financeiro." action={<Button onClick={() => setFormOpen(true)}>Cadastrar conta</Button>} />}
      </DataState></Card>
      <AccountForm open={formOpen} onClose={() => setFormOpen(false)} ledger={ledger}/>
    </div>;
  }
  return <div className="template-page">
    <div className="template-heading"><div><p className="eyebrow">PATRIMÔNIO</p><h1>Contas</h1>
      <p className="muted">Visão separada dos saldos ilustrativos; transferências internas não são receita.</p></div><Badge>3 contas fictícias</Badge></div>
    <div className="template-metrics"><MetricCard label="Saldo total ilustrativo" value={formatCentsBRL(accountsBalance(demoAccounts))}
      supportingText="Agrega apenas os saldos demonstrativos"/></div>
    <Card className="template-table-card"><DataTable ariaLabel="Contas de demonstração"
      columns={columns} rows={demoAccounts} getRowKey={a=>a.id}/></Card>
  </div>;
}
