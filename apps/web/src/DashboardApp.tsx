import { useEffect, useRef, useState, type ComponentType } from 'react';
import { AccountsIcon, BrandIcon, BudgetsIcon, Button, CardsIcon, CategoriesIcon, ConnectionsIcon, DashboardIcon, Dialog, Icon, LogOutIcon, MoonIcon, MoreIcon, PlusIcon, ReportsIcon, ReviewIcon, SavingsIcon, SidebarCollapseIcon, SidebarExpandIcon, SunIcon, TransactionsIcon, type LucideIcon } from '@personal-finance/ui';
import { useTheme } from './hooks/useTheme';
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

export type PageId = 'overview' | 'transactions' | 'accounts' | 'cards' | 'budgets' | 'savings' | 'categories' | 'connections' | 'review' | 'reports';
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
  { id: 'reports', title: 'Relatórios', icon: ReportsIcon }
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
  reports: ReportsPage
};

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
  const { theme, setPreference } = useTheme();
  const ledger = useLedger(ledgerRepository);
  const connections = useConnections(connectionsRepository);
  const { canInstall, install, online } = usePwa();
  const data = ledgerRepository ? ledger.data : undefined;
  const pendingReviews = data ? pendingReviewCount(data.transactions, data) : 0;
  // O nome acessível vem do conteúdo visível (“Revisão 4 pendentes”), como exige a WCAG 2.5.3.
  const badge = (id: PageId) => id === 'review' && pendingReviews > 0
    ? <span className="navigation__badge">{pendingReviews > 99 ? '99+' : pendingReviews}<span className="ui-sr-only"> pendente{pendingReviews === 1 ? '' : 's'}</span></span> : null;
  const themeLabel = theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro';

  useEffect(() => {
    const onHashChange = () => { setPage(getPage()); setMoreOpen(false); };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

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
        <a className="brand" href="#overview" aria-label="Personal Finance Controle pessoal — início">
          <span className="brand-symbol"><Icon icon={BrandIcon} size="lg" className="brand-mark"/></span>
          <span className="brand-copy"><strong>Personal Finance</strong>{' '}<small>Controle pessoal</small></span>
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
        <div className="sidebar-theme">
          <Button className="theme-toggle" size="sm" variant="ghost"
            aria-label={themeLabel} title={themeLabel}
            onClick={() => setPreference(theme === 'light' ? 'dark' : 'light')}>
            <Icon icon={theme === 'light' ? MoonIcon : SunIcon} size="sm" />
          </Button>
        </div>
        {onSignOut && <Button className="sidebar-sign-out" size="sm" variant="danger" aria-label="Sair" title="Sair" onClick={() => setConfirmingSignOut(true)}>
          <Icon icon={LogOutIcon} size="sm" /><span className="sidebar-sign-out__label">Sair</span>
        </Button>}
      </div>
    </aside>
    <main id="conteudo" className="main">
      {!online && <p className="sample-warning" role="status">Sem conexão. Os dados financeiros não são armazenados offline.</p>}
      {!ledgerRepository && <p className="sample-warning" role="note">
        Valores e instituições fictícios. Esta demonstração não consulta contas, não envia dados e não salva transações.
      </p>}
      {ledgerRepository && ledger.status === 'error' && <div className="sample-warning" role="alert">{ledger.error} <Button size="sm" variant="ghost" onClick={() => void ledger.reload()}>Tentar novamente</Button></div>}
      <CurrentPage ledger={ledgerRepository ? ledger : undefined} connections={connectionsRepository ? connections : undefined}
        headerAction={canInstall ? <Button size="sm" variant="secondary" onClick={() => void install()}>Instalar app</Button> : undefined} />
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
      {/* Sair fica no topo da folha, longe da zona do polegar, e sempre pede confirmação (D-041). */}
      {onSignOut && <Button variant="ghost" size="sm" className="more-sheet__sign-out" onClick={() => { setMoreOpen(false); setConfirmingSignOut(true); }}>
        <Icon icon={LogOutIcon} size="sm"/>Sair</Button>}
      <div className="more-sheet__grid">
        {navigation.filter(item => !primaryMobile.includes(item.id)).map(item => <a key={item.id} href={`#${item.id}`}
          aria-current={page === item.id ? 'page' : undefined} className={page === item.id ? 'is-active' : undefined}
          onClick={() => setMoreOpen(false)}>
          <Icon icon={item.icon}/><span>{item.title}</span>
        </a>)}
      </div>
    </Dialog>
    <Dialog open={confirmingSignOut} onClose={() => setConfirmingSignOut(false)} title="Sair do Personal Finance?"
      description="Para voltar, você entra de novo com e-mail e senha. Nada é apagado." className="sign-out-dialog">
      <div data-dialog-actions className="transaction-form__actions sign-out-dialog__actions">
        <Button ref={cancelSignOut} variant="secondary" onClick={() => setConfirmingSignOut(false)}>Cancelar</Button>
        <Button variant="danger" loading={signingOut} onClick={() => void signOut()}><Icon icon={LogOutIcon} size="sm"/>Sair</Button>
      </div>
    </Dialog>
    {ledgerRepository
      ? <ManualTransactionForm open={formOpen} onClose={() => setFormOpen(false)} ledger={ledger} />
      : <TransactionDemoForm open={formOpen} onClose={() => setFormOpen(false)} />}
  </div></PageActionSlotContext.Provider>;
}
