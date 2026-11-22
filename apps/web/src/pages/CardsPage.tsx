import { useId, useState } from 'react';
import type { CardStatement, FinancialAccount } from '@personal-finance/domain';
import { Badge, Button, Card, useToast, CardsIcon, ChevronDownIcon, DataState, DataTable, EmptyState, Icon, MetricCard, Tabs, StatusAlertIcon, type DataTableColumn } from '@personal-finance/ui';
import { demoInvoices, invoiceOpenCents, type DemoInvoice } from '../lib/demo-finance';
import { formatCentsBRL, formatCompetence, formatLocalDate } from '../lib/demo-transactions';
import { buildCardPanels, cardOverview, defaultTab, limitShare, type CardOverview, type CardPanel, type StatementTab } from '../lib/card-panels';
import { useHashParams } from '../hooks/useHashParams';
import { CreditCardForm } from '../components/CreditCardForm';
import { CardPaymentForm } from '../components/CardPaymentForm';
import type { PageProps } from './PageProps';
import { InstitutionLogo } from '../components/InstitutionLogo';
import type { AccountInstitution } from '../ledger/contracts';

const statusLabels = { open: 'Em aberto', partial: 'Parcialmente paga', paid: 'Paga' } as const;
const demoColumns: DataTableColumn<DemoInvoice>[] = [
  { key: 'card', header: 'Cartão', headerIcon: CardsIcon, iconTone: 'warning', cell: item => <strong>{item.cardName}</strong> },
  { key: 'period', header: 'Competência', cell: item => item.period },
  { key: 'due', header: 'Vencimento', cell: item => formatLocalDate(item.dueDate) },
  { key: 'status', header: 'Status', cell: item => <Badge>{statusLabels[item.status]}</Badge> },
  { key: 'open', header: 'Valor pendente', align: 'end', cell: item => formatCentsBRL(invoiceOpenCents(item)) }
];

/** Quantos lançamentos a fatura mostra ao abrir; o restante fica em Transações. */
const PREVIEW_LINES = 6;
const tabStatusLabels = { ...statusLabels, projected: 'Prevista' } as const;
const tabValue = (tab: StatementTab) => !tab.statement ? tab.projectedCents : tab.status === 'paid' ? tab.purchasesCents - tab.refundsCents : tab.openCents;

function CardPanelView({ panel, onConfigure, onLinkPayment, onSettle, institutions }: { panel: CardPanel; onConfigure: () => void; onLinkPayment: (statement: CardStatement) => void; onSettle?: (statement: CardStatement, settled: boolean) => Promise<void>; institutions?: readonly AccountInstitution[] }) {
  const [settling, setSettling] = useState(false);
  const settle = (statement: CardStatement, settled: boolean) => { if (!onSettle) return; setSettling(true); void onSettle(statement, settled).finally(() => setSettling(false)); };
  const [selected, setSelected] = useState<string>();
  const [linesOpen, setLinesOpen] = useState(false);
  const linesId = useId();
  const active = panel.tabs.find(tab => tab.competence === selected) ?? defaultTab(panel.tabs);
  const { account, card } = panel;
  const titleId = `card-${account.id}`;
  const limit = card?.creditLimitCents;
  const share = limit === undefined ? undefined : limitShare(panel.committedCents, limit);
  const openCents = panel.tabs.reduce((sum, tab) => sum + tab.openCents, 0n);
  const visibleLines = active ? [...active.lines].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')).slice(0, PREVIEW_LINES) : [];
  return <Card className="card-panel" aria-labelledby={titleId}>
    <div className="card-panel__top">
      <InstitutionLogo accountId={account.id} accountName={account.name} institutions={institutions} size="lg" />
      <div className="card-panel__heading"><h2 id={titleId}>{account.name}</h2>{card ? <p className="muted">Fecha dia {card.closingDay} · vence dia {card.dueDay}</p> : <Badge>Configuração pendente</Badge>}</div>
      <Button variant={card ? 'secondary' : 'primary'} onClick={onConfigure}>Configurar</Button>
    </div>
    {!card && <p className="sync-status sync-status--failed card-panel__pending"><Icon icon={StatusAlertIcon} size="sm" /><span>As compras deste cartão só aparecem depois que você informar o dia de fechamento e o de vencimento da fatura. Assim que salvar, o app busca as compras no banco.</span></p>}
    {card && <div className="card-panel__limit">
      <p className="card-panel__row"><span className="muted">Limite comprometido</span><strong>{share && limit !== undefined ? `${formatCentsBRL(panel.committedCents)} de ${formatCentsBRL(limit)} · ${share.label}` : 'Limite não informado'}</strong></p>
      {share && <progress className={`budget-progress ${share.basisPoints > 10000 ? 'budget-progress--exceeded' : ''}`} max={10000} value={Math.min(share.basisPoints, 10000)} aria-label={`Limite comprometido: ${share.label}`} />}
      <p className="muted card-panel__note">Faturas em aberto {formatCentsBRL(openCents)} + parcelas futuras {formatCentsBRL(panel.committedCents - openCents)}{share && limit !== undefined ? ` · disponível ${formatCentsBRL(limit - panel.committedCents)}` : ''}</p>
    </div>}
    {card && !active && <EmptyState title="Nenhuma fatura ainda" description="As faturas aparecem quando as primeiras compras deste cartão chegarem do banco." />}
    {active && <Tabs label={`Faturas do ${account.name}`} className="card-tabs" panelClassName="card-statement" selectedId={active.competence} onSelect={id => { setSelected(id); setLinesOpen(false); }}
      items={panel.tabs.map(tab => ({ id: tab.competence, className: `card-tab--${tab.status}`,
        label: <><strong>{formatCompetence(tab.competence)}</strong><span>{tabStatusLabels[tab.status]} · <span className="card-tab__value">{formatCentsBRL(tabValue(tab))}</span></span></> }))}>
        <div className="card-statement__summary">
          {active.statement && <div className="card-statement__pending">
            <div><span className="muted">Pendente · vence {formatLocalDate(active.statement.dueDate)}</span><strong>{formatCentsBRL(active.openCents)}</strong></div>
            {active.openCents > 0n && <div className="card-statement__actions">
              <Button variant="secondary" onClick={() => onLinkPayment(active.statement!)}>Vincular pagamento</Button>
              {/* D-076: paga por fora (conta sem histórico no mês): sai das pendências sem inventar lançamento. */}
              {onSettle && active.statement.dueDate < new Date().toISOString().slice(0, 10) && <Button variant="secondary" loading={settling} onClick={() => settle(active.statement!, true)}>Marcar como paga</Button>}
            </div>}
          </div>}
          {active.settledManually && active.statement && <p className="muted card-statement__settled">Marcada como paga por você: o pagamento não aparece nas contas conectadas.{' '}
            {onSettle && <Button variant="ghost" size="sm" disabled={settling} onClick={() => settle(active.statement!, false)}>Desfazer</Button>}</p>}
          <dl>
            {active.statement && <>
              <div><dt>Compras</dt><dd>{formatCentsBRL(active.purchasesCents)}</dd></div>
              <div><dt>Estornos</dt><dd>− {formatCentsBRL(active.refundsCents)}</dd></div>
              <div><dt>Pagamentos</dt><dd>− {formatCentsBRL(active.paymentsCents)}</dd></div>
            </>}
            {active.projectedCents > 0n && <div className={active.statement ? '' : 'card-statement__total'}><dt>Parcelas previstas</dt><dd>{formatCentsBRL(active.projectedCents)}</dd></div>}
          </dl>
          <p className="muted">{active.statement ? `Fecha em ${formatLocalDate(active.statement.closingDate)}.` : 'Previsão; entra no realizado quando a fatura fechar.'}</p>
        </div>
        {/* D-042: os lançamentos começam recolhidos; abrir mostra os mais recentes e leva ao restante em Transações. */}
        <div className="card-statement__lines">
          <button type="button" className="card-statement__toggle" aria-expanded={linesOpen} aria-controls={linesId} onClick={() => setLinesOpen(value => !value)}>
            <span>Lançamentos <span className="card-statement__count">{active.lines.length}</span></span>
            <span className="card-statement__toggle-label">{linesOpen ? 'Ocultar' : 'Ver lançamentos'}<Icon icon={ChevronDownIcon} size="sm" /></span>
          </button>
          <div id={linesId} hidden={!linesOpen} className="card-statement__list">
            <ul>{visibleLines.map(line => <li key={line.id}>
              <span><strong>{line.description}</strong><span className="muted">{line.date ? `${formatLocalDate(line.date)} · ` : ''}{line.detail}</span></span>
              <strong>{line.credit ? '− ' : ''}{formatCentsBRL(line.amountCents)}</strong>
            </li>)}</ul>
            {active.statement && !active.lines.some(line => line.credit) && <p className="muted card-statement__empty">Nenhum estorno ou pagamento vinculado a esta fatura.</p>}
            {active.lines.length > PREVIEW_LINES && <a className="card-statement__more" href={`#transactions?period=${active.competence}&account=${account.id}`}>Ver os {active.lines.length} em Transações</a>}
          </div>
        </div>
    </Tabs>}
  </Card>;
}

const localToday = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; };

/** D-072: um bloco por cartão na visão geral; tocar abre o detalhe (`#cards?card=<id>`). */
function CardTile({ overview, institutions, onConfigure }: { overview: CardOverview; institutions?: readonly AccountInstitution[]; onConfigure: () => void }) {
  const { panel, current } = overview;
  const { account, card } = panel;
  if (!card) return <section className="card-tile card-tile--pending" aria-labelledby={`tile-${account.id}`}>
    <div className="card-tile__head"><InstitutionLogo accountId={account.id} accountName={account.name} institutions={institutions} size="md" />
      <div><strong id={`tile-${account.id}`}>{account.name}</strong><span className="card-status card-status--closed">Configuração pendente</span></div></div>
    <p className="muted">As compras deste cartão só aparecem depois que você informar o dia de fechamento e o de vencimento da fatura.</p>
    <div><Button onClick={onConfigure}>Configurar</Button></div>
  </section>;
  const share = overview.limitCents === undefined ? undefined : limitShare(panel.committedCents, overview.limitCents);
  const billName = current ? `Fatura de ${formatCompetence(current.competence).toLowerCase()}` : 'Fatura';
  return <a className="card-tile" href={`#cards?card=${account.id}`} aria-label={`${account.name}: ${billName}, ${formatCentsBRL(overview.currentCents)}, ${overview.statusLabel}. Ver detalhes`}>
    <div className="card-tile__head"><InstitutionLogo accountId={account.id} accountName={account.name} institutions={institutions} size="md" />
      <div><strong>{account.name}</strong><span className="muted">Fecha dia {card.closingDay} · vence dia {card.dueDay}</span></div></div>
    <div className="card-tile__bill"><span className="muted">{billName}</span>
      <div><strong className="card-tile__amount">{formatCentsBRL(overview.currentCents)}</strong><span className={`card-status card-status--${overview.tone}`}>{overview.statusLabel}</span></div></div>
    {share && overview.limitCents !== undefined && overview.freeCents !== undefined ? <div className="card-tile__limit">
      <div className="card-tile__limit-row"><span className="muted">Limite usado <strong>{share.label}</strong></span><span className="muted">Livre <strong>{formatCentsBRL(overview.freeCents)}</strong></span></div>
      <progress className={`budget-progress ${share.basisPoints >= 9000 ? 'budget-progress--exceeded' : share.basisPoints >= 7500 ? 'budget-progress--warning' : ''}`} max={10000} value={Math.min(share.basisPoints, 10000)} aria-hidden="true" />
      <span className="muted card-tile__limit-total">{formatCentsBRL(panel.committedCents)} de {formatCentsBRL(overview.limitCents)}</span>
    </div> : <p className="muted card-tile__limit-total">Limite não informado</p>}
    <div className="card-tile__foot"><span className="muted">{overview.nextProjectedCents !== undefined ? <>Próxima fatura (prevista) <strong>{formatCentsBRL(overview.nextProjectedCents)}</strong></> : 'Sem próxima fatura prevista'}</span>
      <span className="card-tile__more">Detalhes<Icon icon={ChevronDownIcon} size="sm" /></span></div>
  </a>;
}

export function CardsPage({ ledger, headerAction }: PageProps) {
  const [params] = useHashParams();
  const { notify } = useToast();
  const [selectedCard, setSelectedCard] = useState<FinancialAccount | null>(null);
  const [selectedStatement, setSelectedStatement] = useState<CardStatement | null>(null);
  if (ledger) {
    const data = ledger.data;
    const panels = buildCardPanels({ accounts: data?.accounts ?? [], cards: data?.creditCards ?? [], statements: data?.cardStatements ?? [],
      entries: data?.cardStatementEntries ?? [], transactions: data?.transactions ?? [], installments: data?.cardInstallments ?? [] });
    const institutions = data?.institutions;
    const detail = panels.find(panel => panel.account.id === params.get('card'));
    const today = localToday();
    const overviews = panels.map(panel => cardOverview(panel, today)).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    const totalOpen = panels.flatMap(panel => panel.tabs).reduce((sum, tab) => sum + tab.openCents, 0n);
    const openCards = panels.filter(panel => panel.tabs.some(tab => tab.openCents > 0n)).length;
    const next = overviews.find(item => item.current?.statement && item.current.openCents > 0n);
    const withLimit = overviews.filter(item => item.limitCents !== undefined);
    const limitTotal = withLimit.reduce((sum, item) => sum + item.limitCents!, 0n);
    const freeTotal = withLimit.reduce((sum, item) => sum + item.freeCents!, 0n);
    const configured = panels.filter(panel => panel.card).length;
    return <div className="template-page">
      <div className="template-heading"><div><p className="eyebrow">CRÉDITO</p><h1>Cartões</h1><p className="muted">{detail ? 'Faturas, limite e lançamentos de um cartão.' : 'Todos os cartões num relance. Toque em um para ver a fatura em detalhe.'}</p></div><div className="template-heading__actions">{headerAction}</div></div>
      <DataState status={ledger.status === 'idle' ? 'loading' : ledger.status} kind="table" rows={3} columns={4} errorDescription={ledger.error} onRetry={() => void ledger.reload()}>
        {detail ? <>
          <a className="card-back" href="#cards"><Icon icon={ChevronDownIcon} size="sm" />Todos os cartões</a>
          <CardPanelView panel={detail} institutions={institutions} onConfigure={() => setSelectedCard(detail.account)} onLinkPayment={setSelectedStatement}
            onSettle={async (statement, settled) => {
              try { await ledger.setStatementSettled(statement.id, settled); notify({ message: settled ? 'Fatura marcada como paga.' : 'Marcação desfeita.', tone: 'success' }); }
              catch { notify({ message: 'Não foi possível atualizar a fatura. Tente de novo.', tone: 'error' }); }
            }}/>
        </> : panels.length ? <>
          <div className="template-metrics card-metrics">
            <MetricCard label="Faturas em aberto" value={formatCentsBRL(totalOpen)} supportingText={`${openCards} de ${configured} ${configured === 1 ? 'cartão' : 'cartões'}`}
              info="O que ainda falta pagar nas faturas abertas e fechadas. A linha “Total da fatura anterior” do banco é só informativa e não entra na conta."/>
            <MetricCard label="Próximo vencimento" value={next?.current?.statement ? `${formatLocalDate(next.current.statement.dueDate).slice(0, 5)} · ${formatCentsBRL(next.currentCents)}` : 'Nenhum'} supportingText={next ? next.panel.account.name : 'Nenhuma fatura pendente'}/>
            <MetricCard label="Limite livre" value={formatCentsBRL(freeTotal)} supportingText={withLimit.length ? `de ${formatCentsBRL(limitTotal)} somados` : 'Limites não informados'}
              info="Limite total menos faturas em aberto e parcelas que ainda vão cair."/>
          </div>
          <div className="card-grid">{overviews.map(item => <CardTile key={item.panel.account.id} overview={item} institutions={institutions} onConfigure={() => setSelectedCard(item.panel.account)} />)}</div>
        </> : <Card><EmptyState title="Seus cartões aparecem aqui" description="Conecte o banco do cartão: faturas, compras e parcelas chegam na sincronização." action={<a className="ui-button ui-button--primary ui-button--md" href="#connections">Conectar banco</a>}/></Card>}
      </DataState>
      <CreditCardForm account={selectedCard} onClose={() => setSelectedCard(null)} ledger={ledger}/>
      <CardPaymentForm statement={selectedStatement} onClose={() => setSelectedStatement(null)} ledger={ledger}/>
    </div>;
  }
  const billed = demoInvoices.reduce((sum, item) => sum + item.purchasesCents, 0n);
  const paid = demoInvoices.reduce((sum, item) => sum + item.paymentsCents, 0n);
  return <div className="template-page"><div className="template-heading"><div><p className="eyebrow">CRÉDITO</p><h1>Cartões</h1><p className="muted">Compras, pagamentos e faturas. Pagar a fatura não conta como gasto de novo.</p></div><div className="template-heading__actions"><Badge>Dados fictícios</Badge>{headerAction}</div></div><div className="template-metrics"><MetricCard label="Compras faturadas" value={formatCentsBRL(billed)} supportingText="Exemplo de composição de faturas"/><MetricCard label="Pagamentos realizados" value={formatCentsBRL(paid)} supportingText="Liquidação patrimonial, não despesa"/><MetricCard label="Total pendente" value={formatCentsBRL(billed - paid)} supportingText="Valores ilustrativos"/></div><Card className="template-table-card"><DataTable ariaLabel="Faturas fictícias" columns={demoColumns} rows={demoInvoices} getRowKey={item => item.id}/></Card></div>;
}
