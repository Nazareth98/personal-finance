import { useEffect, useState, type ComponentType } from 'react';
import { AccountsIcon, Badge, BrandIcon, BudgetsIcon, Button, CardsIcon, ConnectionsIcon, DashboardIcon, Icon, PlusIcon, ReportsIcon, ReviewIcon, SavingsIcon, Select, TransactionsIcon, type LucideIcon } from '@personal-finance/ui';
import { useTheme } from './hooks/useTheme';
import type { ThemePreference } from './lib/theme';
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
import { usePwa } from './hooks/usePwa';

export type PageId = 'overview' | 'transactions' | 'accounts' | 'cards' | 'budgets' | 'savings' | 'connections' | 'review' | 'reports';
const navigation: { id: PageId; title: string; icon: LucideIcon }[] = [
  { id: 'overview', title: 'Visão geral', icon: DashboardIcon },
  { id: 'transactions', title: 'Transações', icon: TransactionsIcon },
  { id: 'accounts', title: 'Contas', icon: AccountsIcon },
  { id: 'cards', title: 'Cartões e faturas', icon: CardsIcon },
  { id: 'budgets', title: 'Orçamentos', icon: BudgetsIcon },
  { id: 'savings', title: 'Caixinhas', icon: SavingsIcon },
  { id: 'connections', title: 'Conexões', icon: ConnectionsIcon },
  { id: 'review', title: 'Revisão', icon: ReviewIcon },
  { id: 'reports', title: 'Relatórios', icon: ReportsIcon }
];

function getPage(): PageId {
  const fragment = window.location.hash.replace(/^#/, '');
  return navigation.some(item => item.id === fragment) ? fragment as PageId : 'overview';
}

const pages: Record<PageId, ComponentType<{ ledger?: LedgerState; connections?: ConnectionsState }>> = {
  overview: OverviewPage,
  transactions: TransactionsPage,
  accounts: AccountsPage,
  cards: CardsPage,
  budgets: BudgetsPage,
  savings: SavingsPage,
  connections: ConnectionsPage,
  review: ReviewPage,
  reports: ReportsPage
};

type DashboardAppProps = {
  userEmail?: string;
  onSignOut?: () => Promise<void>;
  ledgerRepository?: LedgerRepository;
  connectionsRepository?: ConnectionsRepository;
};

export function DashboardApp({ userEmail, onSignOut, ledgerRepository, connectionsRepository }: DashboardAppProps) {
  const [page, setPage] = useState<PageId>(getPage);
  const [formOpen, setFormOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { preference, setPreference } = useTheme();
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
  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#overview" aria-label="Personal Finance — início">
        <Icon icon={BrandIcon} size="lg" className="brand-mark"/><span>Personal Finance</span>
      </a>
      <nav className="navigation" aria-label="Navegação principal">
        {navigation.map(item => <a key={item.id} href={`#${item.id}`}
          aria-current={page === item.id ? 'page' : undefined} className={page === item.id ? 'is-active' : undefined}>
          <Icon icon={item.icon}/>{item.title}
        </a>)}
      </nav>
      <p className="sidebar-note">{ledgerRepository ? 'Livro financeiro pessoal.' : 'Corporate UI v0.5 · Todos os dados são fictícios.'}</p>
    </aside>
    <main id="conteudo" className="main">
      <div className="app-toolbar">
        <span><Badge>{userEmail ?? 'Ambiente demonstrativo'}</Badge></span>
        <div className="app-toolbar__actions">
          <div className="app-theme-control"><Select label="Aparência" value={preference} onChange={event => setPreference(event.target.value as ThemePreference)} options={[{ value: 'system', label: 'Automático' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} /></div>
          {canInstall && <Button size="sm" variant="secondary" onClick={() => void install()}>Instalar app</Button>}
          <Button size="sm" onClick={() => setFormOpen(true)}><Icon icon={PlusIcon} size="sm"/>Nova movimentação{ledgerRepository ? '' : ' (demo)'}</Button>
          {onSignOut && <Button size="sm" variant="ghost" loading={signingOut} onClick={signOut}>Sair</Button>}
        </div>
      </div>
      {!online && <p className="sample-warning" role="status">Sem conexão. Os dados financeiros não são armazenados offline.</p>}
      {!ledgerRepository && <p className="sample-warning" role="note">
        Valores e instituições fictícios. Esta demonstração não consulta contas, não envia dados e não salva transações.
      </p>}
      {ledgerRepository && ledger.status === 'error' && <div className="sample-warning" role="alert">{ledger.error} <Button size="sm" variant="ghost" onClick={() => void ledger.reload()}>Tentar novamente</Button></div>}
      <CurrentPage ledger={ledgerRepository ? ledger : undefined} connections={connectionsRepository ? connections : undefined} />
    </main>
    {ledgerRepository
      ? <ManualTransactionForm open={formOpen} onClose={() => setFormOpen(false)} ledger={ledger} />
      : <TransactionDemoForm open={formOpen} onClose={() => setFormOpen(false)} />}
  </div>;
}
