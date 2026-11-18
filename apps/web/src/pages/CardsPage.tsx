import { useState, type KeyboardEvent } from 'react';
import type { CardStatement, FinancialAccount } from '@personal-finance/domain';
import { Badge, Button, Card, CardsIcon, DataState, DataTable, EmptyState, MetricCard, type DataTableColumn } from '@personal-finance/ui';
import { demoInvoices, invoiceOpenCents, type DemoInvoice } from '../lib/demo-finance';
import { formatCentsBRL, formatCompetence, formatLocalDate } from '../lib/demo-transactions';
import { buildCardPanels, defaultTab, limitShare, type CardPanel, type StatementTab } from '../lib/card-panels';
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

const tabStatusLabels = { ...statusLabels, projected: 'Prevista' } as const;
const tabValue = (tab: StatementTab) => !tab.statement ? tab.projectedCents : tab.status === 'paid' ? tab.purchasesCents - tab.refundsCents : tab.openCents;

function CardPanelView({ panel, onConfigure, onLinkPayment }: { panel: CardPanel; onConfigure: () => void; onLinkPayment: (statement: CardStatement) => void }) {
  const [selected, setSelected] = useState<string>();
  const active = panel.tabs.find(tab => tab.competence === selected) ?? defaultTab(panel.tabs);
  const { account, card } = panel;
  const titleId = `card-${account.id}`;
  const tabId = (competence: string) => `${titleId}-tab-${competence}`;
  const limit = card?.creditLimitCents;
  const share = limit === undefined ? undefined : limitShare(panel.committedCents, limit);
  const openCents = panel.tabs.reduce((sum, tab) => sum + tab.openCents, 0n);
  const select = (competence: string, focus = false) => { setSelected(competence); if (focus) document.getElementById(tabId(competence))?.focus(); };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = panel.tabs.length - 1;
    const next = { ArrowRight: index === last ? 0 : index + 1, ArrowLeft: index === 0 ? last : index - 1, Home: 0, End: last }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    select(panel.tabs[next]!.competence, true);
  };
  return <Card className="card-panel" aria-labelledby={titleId}>
    <div className="card-panel__top">
      <div><h2 id={titleId}>{account.name}</h2>{card ? <p className="muted">Fecha dia {card.closingDay} · vence dia {card.dueDay}</p> : <Badge>Configuração pendente</Badge>}</div>
      <Button variant="secondary" onClick={onConfigure}>Configurar</Button>
    </div>
    {card && <div className="card-panel__limit">
      <p className="card-panel__row"><span className="muted">Limite comprometido</span><strong>{share && limit !== undefined ? `${formatCentsBRL(panel.committedCents)} de ${formatCentsBRL(limit)} · ${share.label}` : 'Limite não informado'}</strong></p>
      {share && <progress className={`budget-progress ${share.basisPoints > 10000 ? 'budget-progress--exceeded' : ''}`} max={10000} value={Math.min(share.basisPoints, 10000)} aria-label={`Limite comprometido: ${share.label}`} />}
      <p className="muted card-panel__note">Faturas em aberto {formatCentsBRL(openCents)} + parcelas futuras {formatCentsBRL(panel.committedCents - openCents)}{share && limit !== undefined ? ` · disponível ${formatCentsBRL(limit - panel.committedCents)}` : ''}</p>
    </div>}
    {card && !active && <EmptyState title="Nenhuma fatura ainda" description="Faturas surgem quando compras deste cartão são sincronizadas." />}
    {active && <>
      <div role="tablist" aria-label={`Faturas do ${account.name}`} className="card-tabs">
        {panel.tabs.map((tab, index) => <button key={tab.competence} id={tabId(tab.competence)} type="button" role="tab" aria-selected={tab === active} aria-controls={`${titleId}-panel`}
          tabIndex={tab === active ? 0 : -1} className={`card-tab card-tab--${tab.status}`} onClick={() => select(tab.competence)} onKeyDown={event => onKeyDown(event, index)}>
          <strong>{formatCompetence(tab.competence)}</strong><span className="card-tab__status">{tabStatusLabels[tab.status]} · {formatCentsBRL(tabValue(tab))}</span>
        </button>)}
      </div>
      <div role="tabpanel" id={`${titleId}-panel`} aria-labelledby={tabId(active.competence)} className="card-statement">
        <div className="card-statement__lines">
          <p className="card-statement__head"><span>Lançamentos da fatura</span><span>Valor</span></p>
          <ul>{active.lines.map(line => <li key={line.id}>
            <span><strong>{line.description}</strong><span className="muted">{line.date ? `${formatLocalDate(line.date)} · ` : ''}{line.detail}</span></span>
            <strong>{line.credit ? '− ' : ''}{formatCentsBRL(line.amountCents)}</strong>
          </li>)}</ul>
          {active.statement && !active.lines.some(line => line.credit) && <p className="muted card-statement__empty">Nenhum estorno ou pagamento vinculado a esta fatura.</p>}
        </div>
        <div className="card-statement__summary">
          <dl>
            {active.statement && <>
              <div><dt>Compras</dt><dd>{formatCentsBRL(active.purchasesCents)}</dd></div>
              <div><dt>Estornos</dt><dd>− {formatCentsBRL(active.refundsCents)}</dd></div>
              <div><dt>Pagamentos</dt><dd>− {formatCentsBRL(active.paymentsCents)}</dd></div>
              <div className="card-statement__total"><dt>Pendente</dt><dd>{formatCentsBRL(active.openCents)}</dd></div>
            </>}
            {active.projectedCents > 0n && <div className={active.statement ? '' : 'card-statement__total'}><dt>Parcelas previstas</dt><dd>{formatCentsBRL(active.projectedCents)}</dd></div>}
          </dl>
          <p className="muted">{active.statement ? `Vence em ${formatLocalDate(active.statement.dueDate)} · fecha em ${formatLocalDate(active.statement.closingDate)}` : 'Previsão; entra no realizado quando a fatura fechar.'}</p>
          {active.statement && active.openCents > 0n && <Button onClick={() => onLinkPayment(active.statement!)}>Vincular pagamento</Button>}
        </div>
      </div>
    </>}
  </Card>;
}

export function CardsPage({ ledger, headerAction }: PageProps) {
  const [selectedCard, setSelectedCard] = useState<FinancialAccount | null>(null);
  const [selectedStatement, setSelectedStatement] = useState<CardStatement | null>(null);
  if (ledger) {
    const data = ledger.data;
    const panels = buildCardPanels({ accounts: data?.accounts ?? [], cards: data?.creditCards ?? [], statements: data?.cardStatements ?? [],
      entries: data?.cardStatementEntries ?? [], transactions: data?.transactions ?? [], installments: data?.cardInstallments ?? [] });
    const tabs = panels.flatMap(panel => panel.tabs);
    const totalOpen = tabs.reduce((sum, tab) => sum + tab.openCents, 0n);
    const next = tabs.filter(tab => tab.statement && tab.openCents > 0n).sort((a, b) => a.statement!.dueDate.localeCompare(b.statement!.dueDate))[0];
    const projected = (data?.cardInstallments ?? []).filter(installment => installment.status === 'projected');
    const lastProjected = projected.map(item => item.dueCompetence).sort().at(-1);
    const totalProjected = projected.reduce((sum, installment) => sum + installment.amountCents, 0n);
    return <div className="template-page">
      <div className="template-heading"><div><p className="eyebrow">CRÉDITO</p><h1>Cartões e faturas</h1><p className="muted">Compras entram na competência do vencimento; pagamentos não viram uma nova despesa.</p></div><div className="template-heading__actions">{headerAction}</div></div>
      <div className="template-metrics">
        <MetricCard label="Pendente em faturas" value={formatCentsBRL(totalOpen)} supportingText="Compras menos estornos e pagamentos"/>
        <MetricCard label="Próxima fatura" value={formatCentsBRL(next?.openCents ?? 0n)} supportingText={next ? `${formatCompetence(next.competence)} · vence em ${formatLocalDate(next.statement!.dueDate)}` : 'Nenhuma fatura pendente'}/>
        <MetricCard label="Parcelas futuras" value={formatCentsBRL(totalProjected)} supportingText={lastProjected ? `${projected.length} ${projected.length === 1 ? 'parcela' : 'parcelas'} até ${formatCompetence(lastProjected)} · fora do realizado` : 'Nenhuma parcela prevista'}/>
      </div>
      <DataState status={ledger.status === 'idle' ? 'loading' : ledger.status} kind="table" rows={3} columns={4} errorDescription={ledger.error} onRetry={() => void ledger.reload()}>
        {panels.length ? panels.map(panel => <CardPanelView key={panel.account.id} panel={panel} onConfigure={() => setSelectedCard(panel.account)} onLinkPayment={setSelectedStatement}/>)
          : <Card><EmptyState title="Nenhum cartão cadastrado" description="Cadastre uma conta do tipo cartão de crédito para começar."/></Card>}
      </DataState>
      <CreditCardForm account={selectedCard} onClose={() => setSelectedCard(null)} ledger={ledger}/>
      <CardPaymentForm statement={selectedStatement} onClose={() => setSelectedStatement(null)} ledger={ledger}/>
    </div>;
  }
  const billed = demoInvoices.reduce((sum, item) => sum + item.purchasesCents, 0n);
  const paid = demoInvoices.reduce((sum, item) => sum + item.paymentsCents, 0n);
  return <div className="template-page"><div className="template-heading"><div><p className="eyebrow">CRÉDITO</p><h1>Cartões e faturas</h1><p className="muted">Compras, pagamentos e faturas sem contabilizar o pagamento como novo consumo.</p></div><div className="template-heading__actions"><Badge>Dados fictícios</Badge>{headerAction}</div></div><div className="template-metrics"><MetricCard label="Compras faturadas" value={formatCentsBRL(billed)} supportingText="Exemplo de composição de faturas"/><MetricCard label="Pagamentos realizados" value={formatCentsBRL(paid)} supportingText="Liquidação patrimonial, não despesa"/><MetricCard label="Total pendente" value={formatCentsBRL(billed - paid)} supportingText="Valores ilustrativos"/></div><Card className="template-table-card"><DataTable ariaLabel="Faturas fictícias" columns={demoColumns} rows={demoInvoices} getRowKey={item => item.id}/></Card></div>;
}
