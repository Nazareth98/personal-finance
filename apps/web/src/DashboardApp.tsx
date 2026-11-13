import { useEffect, useState, type ComponentType } from 'react';
import { Badge, Button, Select } from '@personal-finance/ui';
import { useTheme } from './hooks/useTheme';
import type { ThemePreference } from './lib/theme';
import { TransactionDemoForm } from './components/TransactionDemoForm';
import { OverviewPage } from './pages/OverviewPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { AccountsPage } from './pages/AccountsPage';
import { CardsPage } from './pages/CardsPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { ReportsPage } from './pages/ReportsPage';

export type PageId = 'overview' | 'transactions' | 'accounts' | 'cards' | 'budgets' | 'reports';
const navigation: { id: PageId; title: string; icon: string }[] = [
  { id: 'overview', title: 'Visão geral', icon: '▦' },
  { id: 'transactions', title: 'Transações', icon: '⇄' },
  { id: 'accounts', title: 'Contas', icon: '▤' },
  { id: 'cards', title: 'Cartões e faturas', icon: '▣' },
  { id: 'budgets', title: 'Orçamentos', icon: '◫' },
  { id: 'reports', title: 'Relatórios', icon: '▥' }
];

function getPage(): PageId {
  const fragment = window.location.hash.replace(/^#/, '');
  return navigation.some(item => item.id === fragment) ? fragment as PageId : 'overview';
}

const pages: Record<PageId, ComponentType> = {
  overview: OverviewPage,
  transactions: TransactionsPage,
  accounts: AccountsPage,
  cards: CardsPage,
  budgets: BudgetsPage,
  reports: ReportsPage
};

type DashboardAppProps = {
  userEmail?: string;
  onSignOut?: () => Promise<void>;
};

export function DashboardApp({ userEmail, onSignOut }: DashboardAppProps) {
  const [page, setPage] = useState<PageId>(getPage);
  const [formOpen, setFormOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { preference, setPreference } = useTheme();

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
        <span className="brand-mark" aria-hidden="true">◈</span><span>Personal Finance</span>
      </a>
      <nav className="navigation" aria-label="Navegação principal">
        {navigation.map(item => <a key={item.id} href={`#${item.id}`}
          aria-current={page === item.id ? 'page' : undefined} className={page === item.id ? 'is-active' : undefined}>
          <span aria-hidden="true">{item.icon}</span>{item.title}
        </a>)}
      </nav>
      <p className="sidebar-note">Corporate UI v0.5 · Todos os dados são fictícios.</p>
    </aside>
    <main id="conteudo" className="main">
      <div className="app-toolbar">
        <span><Badge>{userEmail ?? 'Ambiente demonstrativo'}</Badge></span>
        <div className="app-toolbar__actions">
          <div className="app-theme-control"><Select label="Aparência" value={preference} onChange={event => setPreference(event.target.value as ThemePreference)} options={[{ value: 'system', label: 'Automático' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} /></div>
          <Button size="sm" onClick={() => setFormOpen(true)}>+ Nova movimentação (demo)</Button>
          {onSignOut && <Button size="sm" variant="ghost" loading={signingOut} onClick={signOut}>Sair</Button>}
        </div>
      </div>
      <p className="sample-warning" role="note">
        Valores e instituições fictícios. Esta demonstração não consulta contas, não envia dados e não salva transações.
      </p>
      <CurrentPage />
    </main>
    <TransactionDemoForm open={formOpen} onClose={() => setFormOpen(false)} />
  </div>;
}
