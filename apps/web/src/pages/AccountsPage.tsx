import { useState } from 'react';
import type { FinancialAccount } from '@personal-finance/domain';
import { AccountsIcon, Badge, Button, Card, CardsIcon, CategoryWalletIcon, DataState, DataTable, EditIcon, EmptyState, Icon, MetricCard, type DataTableColumn, type LucideIcon } from '@personal-finance/ui';
import { accountsBalance, demoAccounts, type DemoAccount } from '../lib/demo-finance';
import { formatCentsBRL, formatCompetence, formatLocalDate } from '../lib/demo-transactions';
import { buildAccountPanels, type AccountCardView, type AccountKind } from '../lib/account-panels';
import { buildCardPanels } from '../lib/card-panels';
import type { LedgerState } from '../ledger/useLedger';
import { AccountForm } from '../components/AccountForm';
import type { PageProps } from './PageProps';
import { PageAction } from '../components/PageAction';
import { InstitutionLogo } from '../components/InstitutionLogo';
import type { AccountInstitution } from '../ledger/contracts';
const types: Record<DemoAccount['type'], string> = { checking:'Conta corrente', savings:'Reserva', investment:'Investimento' };
const realTypes: Record<FinancialAccount['type'], string> = { ...types, credit_card: 'Cartão de crédito' };
const columns:DataTableColumn<DemoAccount>[] = [
  {key:'name',header:'Conta',headerIcon:AccountsIcon,iconTone:'transfer',cell:a=><strong>{a.name}</strong>},
  {key:'type',header:'Tipo',cell:a=><Badge>{types[a.type]}</Badge>},
  {key:'balance',header:'Saldo demonstrativo',align:'end',cell:a=>formatCentsBRL(a.balanceCents)}
];
const pad = (value: number) => String(value).padStart(2, '0');
const currentMonth = () => { const now = new Date(); return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`; };

const kindCopy: Record<AccountKind, { title: string; icon: LucideIcon; color: string }> = {
  checking: { title: 'Contas correntes', icon: AccountsIcon, color: 'chart-category-1' },
  reserve: { title: 'Reservas e investimentos', icon: CategoryWalletIcon, color: 'chart-category-2' },
  credit_card: { title: 'Cartões de crédito', icon: CardsIcon, color: 'chart-category-3' }
};
const signedBRL = (cents: bigint) => cents < 0n ? `− ${formatCentsBRL(-cents)}` : formatCentsBRL(cents);

function AccountCard({ item, month, onEdit, institutions }: { item: AccountCardView; month: string; onEdit: () => void; institutions?: readonly AccountInstitution[] }) {
  const { account, balanceCents, inCents, outCents, lastEventDate, bill } = item;
  const copy = kindCopy[account.type === 'credit_card' ? 'credit_card' : account.type === 'checking' ? 'checking' : 'reserve'];
  const transactionsLink = `#transactions?period=${month}&account=${account.id}`;
  return <Card className="budget-card goal-card">
    <div className="budget-card__top">
      {/* D-052: conta conectada mostra o banco real; manual mantém o ícone do tipo. */}
      {institutions?.some(entry => entry.accountId === account.id)
        ? <InstitutionLogo accountId={account.id} accountName={account.name} institutions={institutions} size="lg" />
        : <span className={`category-identity__icon category-identity__icon--${copy.color}`} aria-hidden="true"><Icon icon={copy.icon} size="sm" /></span>}
      <div className="budget-card__title"><h3>{account.name}</h3><span className="muted">{realTypes[account.type]}</span></div>
      <Button variant="ghost" size="sm" aria-label={`Editar conta ${account.name}`} onClick={onEdit}><Icon icon={EditIcon} size="sm" /></Button>
    </div>
    {bill
      ? <>
        <div className="budget-card__result"><span className="muted">Fatura de {formatCompetence(bill.competence)} em aberto</span><strong>{bill.openCents > 0n ? `− ${formatCentsBRL(bill.openCents)}` : formatCentsBRL(0n)}</strong></div>
        {bill.limitCents ? <>
          <progress className="budget-progress" max={100} value={Math.min(100, (bill.limitBasisPoints ?? 0) / 100)} aria-label={`Limite comprometido de ${account.name}: ${bill.limitLabel}`} />
          <div className="budget-card__usage"><span className="muted">Limite comprometido</span><strong>{bill.limitLabel} de {formatCentsBRL(bill.limitCents)}</strong></div>
        </> : null}
        <p className="budget-card__pace muted">{bill.dueDate ? `Vence em ${formatLocalDate(bill.dueDate)}. ` : ''}Pagamento de fatura não é nova despesa.</p>
      </>
      : <>
        <div className="budget-card__result"><span className="muted">Saldo pelo livro</span><strong>{signedBRL(balanceCents)}</strong></div>
        <dl className="connection-times" aria-label={`Movimento em ${formatCompetence(month)}`}>
          <div><dt>Entradas em {formatCompetence(month)}</dt><dd className="transaction-amount--income">+ {formatCentsBRL(inCents)}</dd></div>
          <div><dt>Saídas em {formatCompetence(month)}</dt><dd>− {formatCentsBRL(outCents)}</dd></div>
        </dl>
        <p className="budget-card__pace muted">{lastEventDate ? `Último lançamento em ${formatLocalDate(lastEventDate)}.` : 'Nenhum lançamento ainda.'}</p>
      </>}
    <div className="goal-card__actions goal-card__actions--links">
      <a className="ui-button ui-button--secondary ui-button--sm" href={transactionsLink}>Ver lançamentos</a>
      {bill && <a className="ui-button ui-button--ghost ui-button--sm" href="#cards">Ver fatura</a>}
    </div>
  </Card>;
}

function RealAccounts({ ledger, headerAction }: { ledger: LedgerState; headerAction: PageProps['headerAction'] }) {
  const [form, setForm] = useState<{ account?: FinancialAccount } | null>(null);
  const data = ledger.data;
  const month = currentMonth();
  const cardPanels = buildCardPanels({ accounts: data?.accounts ?? [], cards: data?.creditCards ?? [], statements: data?.cardStatements ?? [],
    entries: data?.cardStatementEntries ?? [], transactions: data?.transactions ?? [], installments: data?.cardInstallments ?? [] });
  const panels = buildAccountPanels({ accounts: data?.accounts ?? [], transactions: data?.transactions ?? [], cardPanels, month });
  const nonCards = (data?.accounts ?? []).filter(account => account.type !== 'credit_card').length;
  const cards = (data?.accounts ?? []).length - nonCards;
  return <div className="template-page">
    <div className="template-heading"><div><p className="eyebrow">PATRIMÔNIO</p><h1>Contas</h1><p className="muted">Saldos reconstruídos pelo saldo inicial e pelos lançamentos.</p></div>
      <div className="template-heading__actions"><PageAction label="Nova conta" shortLabel="Conta" onClick={() => setForm({})} />{headerAction}</div></div>
    <section className="summary-strip" aria-label="Resumo das contas">
      <div><span className="muted">Disponível em contas</span><strong>{signedBRL(panels.availableCents)}</strong><span className="muted">{nonCards === 1 ? '1 conta' : `${nonCards} contas`}, sem cartões</span></div>
      <div><span className="muted">Faturas em aberto</span><strong>{panels.openBillsCents > 0n ? `− ${formatCentsBRL(panels.openBillsCents)}` : formatCentsBRL(0n)}</strong><span className="muted">{cards === 1 ? '1 cartão' : `${cards} cartões`}</span></div>
      <div><span className="muted">Receitas em {formatCompetence(month)}</span><strong className="transaction-amount--income">+ {formatCentsBRL(panels.incomeCents)}</strong><span className="muted">Sem transferências próprias</span></div>
      <div><span className="muted">Despesas em {formatCompetence(month)}</span><strong>− {formatCentsBRL(panels.expenseCents)}</strong><span className="muted">Sem transferências próprias</span></div>
    </section>
    <DataState status={ledger.status === 'idle' ? 'loading' : ledger.status} kind="table" rows={4} columns={3} errorDescription={ledger.error} onRetry={() => void ledger.reload()}>
      {panels.groups.length === 0
        ? <EmptyState title="Nenhuma conta cadastrada" description="Cadastre a primeira conta para iniciar o livro financeiro." action={<Button onClick={() => setForm({})}>Cadastrar conta</Button>} />
        : panels.groups.map(group => {
          const copy = kindCopy[group.kind];
          return <section key={group.kind} className="status-group" aria-labelledby={`accounts-group-${group.kind}`}>
            <h2 id={`accounts-group-${group.kind}`} className="status-group__title status-tone--within"><Icon icon={copy.icon} size="sm" />{copy.title}<span className="muted"> · {group.items.length}</span></h2>
            <div className="goal-grid">{group.items.map(item => <AccountCard key={item.account.id} item={item} month={month} institutions={data?.institutions} onEdit={() => setForm({ account: item.account })} />)}</div>
          </section>;
        })}
    </DataState>
    {form && <AccountForm key={form.account?.id ?? 'new'} open onClose={() => setForm(null)} ledger={ledger} account={form.account} />}
  </div>;
}

export function AccountsPage({ ledger, headerAction }: PageProps) {
  if (ledger) return <RealAccounts ledger={ledger} headerAction={headerAction} />;
  return <div className="template-page">
    <div className="template-heading"><div><p className="eyebrow">PATRIMÔNIO</p><h1>Contas</h1>
      <p className="muted">Visão separada dos saldos ilustrativos; transferências internas não são receita.</p></div><div className="template-heading__actions"><Badge>3 contas fictícias</Badge>{headerAction}</div></div>
    <div className="template-metrics"><MetricCard label="Saldo total ilustrativo" value={formatCentsBRL(accountsBalance(demoAccounts))}
      supportingText="Agrega apenas os saldos demonstrativos"/></div>
    <Card className="template-table-card"><DataTable ariaLabel="Contas de demonstração"
      columns={columns} rows={demoAccounts} getRowKey={a=>a.id}/></Card>
  </div>;
}
