import { useEffect, useState, type ComponentType } from 'react';
import { AccountsIcon, BrandIcon, BudgetsIcon, Button, CardsIcon, CategoriesIcon, ConnectionsIcon, DashboardIcon, Icon, LogOutIcon, MoonIcon, PlusIcon, ReportsIcon, ReviewIcon, SavingsIcon, SidebarCollapseIcon, SidebarExpandIcon, SunIcon, TransactionsIcon, type LucideIcon } from '@personal-finance/ui';
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
import type { PageProps } from './pages/PageProps';

export type PageId = 'overview' | 'transactions' | 'accounts' | 'cards' | 'budgets' | 'savings' | 'categories' | 'connections' | 'review' | 'reports';
const navigation: { id: PageId; title: string; icon: LucideIcon }[] = [
  { id: 'overview', title: 'Visão geral', icon: DashboardIcon },
  { id: 'transactions', title: 'Transações', icon: TransactionsIcon },
  { id: 'accounts', title: 'Contas', icon: AccountsIcon },
  { id: 'cards', title: 'Cartões e faturas', icon: CardsIcon },
  { id: 'budgets', title: 'Orçamentos', icon: BudgetsIcon },
  { id: 'savings', title: 'Caixinhas', icon: SavingsIcon },
  { id: 'categories', title: 'Categorias', icon: CategoriesIcon },
  { id: 'connections', title: 'Conexões', icon: ConnectionsIcon },
  { id: 'review', title: 'Revisão', icon: ReviewIcon },
  { id: 'reports', title: 'Relatórios', icon: ReportsIcon }
];

function getPage(): PageId {
  const fragment = window.location.hash.replace(/^#/, '');
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { theme, setPreference } = useTheme();
  const ledger = useLedger(ledgerRepository);
  const connections = useConnections(connectionsRepository);
  const { canInstall, install, online } = usePwa();

  useEffect(() => {
    const onHashChange = () => setPage(getPage());
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
    }
  }

  const CurrentPage = pages[page];
  return <div className={`app-shell${sidebarCollapsed ? ' app-shell--sidebar-collapsed' : ''}`}>
    <aside className={`sidebar${sidebarCollapsed ? ' is-collapsed' : ''}`}>
      <div className="sidebar-header">
        <a className="brand" href="#overview" aria-label="Personal Finance Controle pessoal — início">
          <span className="brand-symbol"><Icon icon={BrandIcon} size="lg" className="brand-mark"/></span>
          <span className="brand-copy"><strong>Personal Finance</strong>{' '}<small>Controle pessoal</small></span>
        </a>
        <Button className="sidebar-collapse" size="sm" variant="ghost" aria-controls="sidebar-navigation"
          aria-expanded={!sidebarCollapsed} aria-label={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
          title={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'} onClick={() => setSidebarCollapsed(value => !value)}>
          <Icon icon={sidebarCollapsed ? SidebarExpandIcon : SidebarCollapseIcon} size="sm" />
        </Button>
      </div>
      <span className="sidebar-section-label">Menu principal</span>
      <nav id="sidebar-navigation" className="navigation" aria-label="Navegação principal">
        {navigation.map(item => <a key={item.id} href={`#${item.id}`}
          aria-current={page === item.id ? 'page' : undefined} className={page === item.id ? 'is-active' : undefined}
          aria-label={item.title} title={sidebarCollapsed ? item.title : undefined}>
          <span className="navigation__icon"><Icon icon={item.icon}/></span><span className="navigation__label">{item.title}</span>
        </a>)}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-theme">
          <Button className="theme-toggle" size="sm" variant="ghost"
            aria-label={theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro'}
            title={theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro'}
            onClick={() => setPreference(theme === 'light' ? 'dark' : 'light')}>
            <Icon icon={theme === 'light' ? MoonIcon : SunIcon} size="sm" />
          </Button>
        </div>
        {onSignOut && <Button className="sidebar-sign-out" size="sm" variant="danger" aria-label="Sair" title="Sair" loading={signingOut} onClick={signOut}>
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
        headerAction={<>
          {canInstall && <Button size="sm" variant="secondary" onClick={() => void install()}>Instalar app</Button>}
          <Button size="sm" onClick={() => setFormOpen(true)}><Icon icon={PlusIcon} size="sm"/>Nova movimentação{ledgerRepository ? '' : ' (demo)'}</Button>
        </>} />
    </main>
    {ledgerRepository
      ? <ManualTransactionForm open={formOpen} onClose={() => setFormOpen(false)} ledger={ledger} />
      : <TransactionDemoForm open={formOpen} onClose={() => setFormOpen(false)} />}
  </div>;
}
