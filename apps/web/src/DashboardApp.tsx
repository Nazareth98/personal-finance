import { useEffect, useRef, useState, type ComponentType } from 'react';
import { HelpPanel } from './components/HelpPanel';
import { FirstSteps } from './components/FirstSteps';
import { GlossaryPage } from './pages/GlossaryPage';
import { buildFirstSteps } from './lib/first-steps';
import { AccountsIcon, BrandMark, HideIcon, ShowIcon, BudgetsIcon, Button, CardsIcon, CategoriesIcon, ConnectionsIcon, DashboardIcon, Dialog, Icon, LogOutIcon, MoonIcon, MoreIcon, PlusIcon, ReportsIcon, ReviewIcon, SavingsIcon, SidebarCollapseIcon, SidebarExpandIcon, StatusAlertIcon, SunIcon, SyncIcon, TransactionsIcon, GlossaryIcon, HelpIcon, type LucideIcon } from '@personal-finance/ui';
import { useTheme } from './hooks/useTheme';
import { useValuesHidden } from './hooks/useValuesHidden';
import { AccountMenu } from './components/AccountMenu';
import { HolderNameForm } from './components/HolderNameForm';
import { TransactionDemoForm } from './components/TransactionDemoForm';
import { OverviewPage } from './pages/OverviewPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { AccountsPage } from './pages/AccountsPage';
import { CardsPage } from './pages/CardsPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SavingsPage } from './pages/SavingsPage';
import type { LedgerRepository } from './ledger/contracts';
import { useLedger, type LedgerState } from './ledger/useLedger';
import { ManualTransactionForm } from './components/ManualTransactionForm';
import type { ConnectionsRepository } from './integrations/contracts';
import { useConnections, type ConnectionsState } from './integrations/useConnections';
import { ConnectionsPage } from './pages/ConnectionsPage';
import { ReviewPage } from './pages/ReviewPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { usePwa } from './hooks/usePwa';
import { PageActionSlotContext } from './components/PageAction';
import { pendingReviewCount } from './lib/review-queue';
import type { PageProps } from './pages/PageProps';

export type PageId = 'overview' | 'transactions' | 'accounts' | 'cards' | 'budgets' | 'savings' | 'categories' | 'connections' | 'review' | 'reports' | 'glossary';
/** Telas de uso diário que ficam na barra inferior; as demais vão para “Mais”. */
const primaryMobile: readonly PageId[] = ['overview', 'transactions', 'review', 'cards'];
const navigation: { id: PageId; title: string; shortTitle?: string; icon: LucideIcon }[] = [
  { id: 'overview', title: 'Visão geral', icon: DashboardIcon },
  { id: 'transactions', title: 'Transações', icon: TransactionsIcon },
  { id: 'accounts', title: 'Contas', icon: AccountsIcon },
  { id: 'cards', title: 'Cartões e faturas', shortTitle: 'Cartões', icon: CardsIcon },
  { id: 'budgets', title: 'Orçamentos', icon: BudgetsIcon },
  { id: 'savings', title: 'Caixinhas', icon: SavingsIcon },
  { id: 'categories', title: 'Categorias', icon: CategoriesIcon },
  { id: 'connections', title: 'Conexões', icon: ConnectionsIcon },
  { id: 'review', title: 'Revisão', icon: ReviewIcon },
  { id: 'reports', title: 'Relatórios', icon: ReportsIcon },
  { id: 'glossary', title: 'Como funciona', icon: GlossaryIcon }
];

function getPage(): PageId {
  const fragment = window.location.hash.replace(/^#/, '').split('?')[0];
  return navigation.some(item => item.id === fragment) ? fragment as PageId : 'overview';
}

const pages: Record<PageId, ComponentType<PageProps>> = {
  overview: OverviewPage,
  transactions: TransactionsPage,
  accounts: AccountsPage,
  cards: CardsPage,
  budgets: BudgetsPage,
  savings: SavingsPage,
  categories: CategoriesPage,
  connections: ConnectionsPage,
  review: ReviewPage,
  reports: ReportsPage,
  glossary: GlossaryPage
};

const firstStepsKey = 'pf:first-steps-dismissed';
function readDismissed(): boolean { try { return localStorage.getItem(firstStepsKey) === '1'; } catch { return false; } }

type DashboardAppProps = {
  onSignOut?: () => Promise<void>;
  ledgerRepository?: LedgerRepository;
  connectionsRepository?: ConnectionsRepository;
};

export function DashboardApp({ onSignOut, ledgerRepository, connectionsRepository }: DashboardAppProps) {
  const [page, setPage] = useState<PageId>(getPage);
  const [formOpen, setFormOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [holderOpen, setHolderOpen] = useState(false);
  const [actionSlot, setActionSlot] = useState<HTMLDivElement | null>(null);
  const cancelSignOut = useRef<HTMLButtonElement>(null);
  // Confirmação de saída começa no Cancelar (D-041); o diálogo nativo focaria o botão de fechar.
  useEffect(() => {
    if (!confirmingSignOut) return;
    const frame = requestAnimationFrame(() => cancelSignOut.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [confirmingSignOut]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [firstStepsDismissed, setFirstStepsDismissed] = useState(readDismissed);
  const dismissFirstSteps = (value: boolean) => {
    setFirstStepsDismissed(value);
    try { if (value) localStorage.setItem(firstStepsKey, '1'); else localStorage.removeItem(firstStepsKey); } catch { /* sem armazenamento: vale só nesta sessão */ }
  };
  const { theme, setPreference } = useTheme();
  const [valuesHidden, setValuesHidden] = useValuesHidden();
  const ledger = useLedger(ledgerRepository);
  const connections = useConnections(connectionsRepository);
  const [syncFailed, setSyncFailed] = useState(false);
  // D-061: ao abrir e ao voltar à aba, sincroniza em segundo plano o que está há mais de 6 h sem tentativa; sem timer.
  useEffect(() => {
    if (!connectionsRepository || !ledgerRepository || connections.status !== 'success') return;
    const run = () => void connections.syncStale().then(result => {
      if (result === 'none') return;
      setSyncFailed(result === 'failed');
      void ledger.refresh();
    });
    run();
    const onVisible = () => { if (document.visibilityState === 'visible') run(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [connections.status]);
  const { canInstall, install, online } = usePwa();
  const data = ledgerRepository ? ledger.data : undefined;
  const pendingReviews = data ? pendingReviewCount(data.transactions, data) : 0;
  // O nome acessível vem do conteúdo visível (“Revisão 4 pendentes”), como exige a WCAG 2.5.3.
  const badge = (id: PageId) => id === 'review' && pendingReviews > 0
    ? <span className="navigation__badge">{pendingReviews > 99 ? '99+' : pendingReviews}<span className="ui-sr-only"> pendente{pendingReviews === 1 ? '' : 's'}</span></span> : null;
  const firstSteps = data && connections.data && !firstStepsDismissed ? buildFirstSteps(data, connections.data, pendingReviews) : null;
  const showFirstSteps = () => { dismissFirstSteps(false); window.location.hash = '#overview'; };
  const themeLabel = theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro';

  useEffect(() => {
    const onHashChange = () => { setPage(getPage()); setMoreOpen(false); };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  // Nova aba começa do topo; filtros usam replaceState e não trocam a página, então não mexem na rolagem.
  useEffect(() => { window.scrollTo(0, 0); }, [page]);

  async function signOut() {
    if (!onSignOut) return;
    setSigningOut(true);
    try {
      await onSignOut();
    } finally {
      setSigningOut(false);
      setConfirmingSignOut(false);
    }
  }

  const CurrentPage = pages[page];
  const newEntryLabel = `Nova movimentação${ledgerRepository ? '' : ' (demo)'}`;
  const pageTitle = navigation.find(item => item.id === page)?.title ?? '';
  return <PageActionSlotContext.Provider value={actionSlot}><div className={`app-shell${sidebarCollapsed ? ' app-shell--sidebar-collapsed' : ''}`}>
    <aside className={`sidebar${sidebarCollapsed ? ' is-collapsed' : ''}`}>
      <div className="sidebar-header">
        <a className="brand" href="#overview" aria-label="Balanço, finanças pessoais — início">
          <span className="brand-symbol"><BrandMark size={28} className="brand-mark"/></span>
          <span className="brand-copy"><strong>Balanço</strong>{' '}<small>Finanças pessoais</small></span>
        </a>
        {/* Até 1000 px o título da aba ocupa o lugar da marca; o h1 continua na página para leitores de tela. */}
        <p className="app-bar__title" aria-hidden="true">{pageTitle}</p>
        <Button className="sidebar-collapse" size="sm" variant="ghost" aria-controls="sidebar-navigation"
          aria-expanded={!sidebarCollapsed} aria-label={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
          title={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'} onClick={() => setSidebarCollapsed(value => !value)}>
          <Icon icon={sidebarCollapsed ? SidebarExpandIcon : SidebarCollapseIcon} size="sm" />
        </Button>
      </div>
      {/* Ação principal do app: no desktop fica no topo da sidebar; até 1000 px vira o botão flutuante. */}
      <Button className="sidebar-new-entry" onClick={() => setFormOpen(true)} title={sidebarCollapsed ? newEntryLabel : undefined}>
        <Icon icon={PlusIcon} size="sm"/><span className="sidebar-new-entry__label">{newEntryLabel}</span>
      </Button>
      <span className="sidebar-section-label">Menu principal</span>
      <nav id="sidebar-navigation" className="navigation" aria-label="Navegação principal">
        {navigation.map(item => <a key={item.id} href={`#${item.id}`}
          aria-current={page === item.id ? 'page' : undefined} className={page === item.id ? 'is-active' : undefined} title={sidebarCollapsed ? item.title : undefined}>
          <span className="navigation__icon"><Icon icon={item.icon}/></span><span className="navigation__label">{item.title}</span>{badge(item.id)}
        </a>)}
      </nav>
      <div className="sidebar-footer">
        <div className="app-bar__action" ref={setActionSlot} />
        <div className="sidebar-account">
        {/* Ocultar valores (D-049): olho aberto = valores à mostra; o estado vale para o app todo e fica salvo no aparelho. */}
        <Button className="privacy-toggle" size="sm" variant="ghost" aria-pressed={valuesHidden}
          aria-label="Ocultar valores" title={valuesHidden ? 'Mostrar valores' : 'Ocultar valores'}
          onClick={() => setValuesHidden(!valuesHidden)}>
          <Icon icon={valuesHidden ? HideIcon : ShowIcon} size="sm" />
        </Button>
        {onSignOut
          ? <AccountMenu darkTheme={theme === 'dark'} onToggleTheme={() => setPreference(theme === 'light' ? 'dark' : 'light')}
            onSignOut={() => setConfirmingSignOut(true)} {...(ledgerRepository ? { onEditHolder: () => setHolderOpen(true) } : {})} />
          : <div className="sidebar-theme">
            <Button className="theme-toggle" size="sm" variant="ghost"
              aria-label={themeLabel} title={themeLabel}
              onClick={() => setPreference(theme === 'light' ? 'dark' : 'light')}>
              <Icon icon={theme === 'light' ? MoonIcon : SunIcon} size="sm" />
            </Button>
          </div>}
        </div>
      </div>
    </aside>
    <main id="conteudo" className="main">
      {!online && <p className="sample-warning" role="status">Sem conexão. Os dados financeiros não são armazenados offline.</p>}
      {!ledgerRepository && <p className="sample-warning" role="note">
        Valores e instituições fictícios. Esta demonstração não consulta contas, não envia dados e não salva transações.
      </p>}
      {connections.autoSyncing && <p className="sync-status" role="status"><Icon icon={SyncIcon} size="sm" className="sync-status__spin" />Atualizando contas…</p>}
      {!connections.autoSyncing && syncFailed && page !== 'connections' && <p className="sync-status sync-status--failed" role="status">
        <Icon icon={StatusAlertIcon} size="sm" />Não foi possível atualizar as contas automaticamente. <a href="#connections">Ver conexões</a></p>}
      {ledgerRepository && ledger.status === 'error' && <div className="sample-warning" role="alert">{ledger.error} <Button size="sm" variant="ghost" onClick={() => void ledger.reload()}>Tentar novamente</Button></div>}
      <CurrentPage ledger={ledgerRepository ? ledger : undefined} connections={connectionsRepository ? connections : undefined}
        intro={page === 'overview' && firstSteps ? <FirstSteps steps={firstSteps} onDismiss={() => dismissFirstSteps(true)}
          {...(ledgerRepository ? { onEditHolder: () => setHolderOpen(true) } : {})} /> : undefined}
        headerAction={<>
          {page !== 'glossary' && <Button className="help-toggle" size="sm" variant="ghost" aria-label="Ajuda desta tela" title="Ajuda desta tela"
            aria-haspopup="dialog" onClick={() => setHelpOpen(true)}><Icon icon={HelpIcon} size="sm" /></Button>}
          {canInstall && <Button size="sm" variant="secondary" onClick={() => void install()}>Instalar app</Button>}
        </>} />
    </main>
    <Button className="fab-new-entry" aria-label={newEntryLabel} title={newEntryLabel} onClick={() => setFormOpen(true)}>
      <Icon icon={PlusIcon}/>
    </Button>
    {/* Até 1000 px a lista da sidebar some e esta barra assume o papel de navegação principal. */}
    <nav className="bottom-nav" aria-label="Navegação principal">
      {primaryMobile.map(id => navigation.find(item => item.id === id)!).map(item => <a key={item.id} href={`#${item.id}`}
        aria-current={page === item.id ? 'page' : undefined} className={page === item.id ? 'is-active' : undefined}>
        <span className="bottom-nav__icon"><Icon icon={item.icon}/></span><span>{item.shortTitle ?? item.title}</span>{badge(item.id)}
      </a>)}
      <button type="button" className={`bottom-nav__more${primaryMobile.includes(page) ? '' : ' is-active'}`}
        aria-haspopup="dialog" aria-expanded={moreOpen} onClick={() => setMoreOpen(true)}>
        <span className="bottom-nav__icon"><Icon icon={MoreIcon}/></span><span>Mais</span>
      </button>
    </nav>
    <Dialog open={moreOpen} onClose={() => setMoreOpen(false)} title="Mais telas" className="more-sheet">
      <div className="more-sheet__grid">
        {navigation.filter(item => !primaryMobile.includes(item.id)).map(item => <a key={item.id} href={`#${item.id}`}
          aria-current={page === item.id ? 'page' : undefined} className={page === item.id ? 'is-active' : undefined}
          onClick={() => setMoreOpen(false)}>
          <Icon icon={item.icon}/><span>{item.title}</span>
        </a>)}
      </div>
    </Dialog>
    {page !== 'glossary' && <HelpPanel page={page} open={helpOpen} onClose={() => setHelpOpen(false)}
      {...(ledgerRepository && connectionsRepository ? { onShowFirstSteps: showFirstSteps } : {})} />}
    <Dialog open={confirmingSignOut} onClose={() => setConfirmingSignOut(false)} title="Sair da conta"
      footer={<>
        <Button ref={cancelSignOut} variant="secondary" onClick={() => setConfirmingSignOut(false)}>Cancelar</Button>
        <Button variant="danger" loading={signingOut} onClick={() => void signOut()}><Icon icon={LogOutIcon} size="sm"/>Sair</Button>
      </>}>
      <p className="ui-dialog__question">Deseja sair do Balanço?</p>
      <p className="muted">Para voltar, você entra de novo com e-mail e senha. Nada é apagado.</p>
    </Dialog>
    {ledgerRepository && <HolderNameForm open={holderOpen} onClose={() => setHolderOpen(false)} ledger={ledger} />}
    {ledgerRepository
      ? <ManualTransactionForm open={formOpen} onClose={() => setFormOpen(false)} ledger={ledger} />
      : <TransactionDemoForm open={formOpen} onClose={() => setFormOpen(false)} />}
  </div></PageActionSlotContext.Provider>;
}
