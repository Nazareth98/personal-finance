import { useEffect, useState, type ComponentType } from 'react';
import { Badge, Button } from '@personal-finance/ui';
import { TransactionDemoForm } from './components/TransactionDemoForm';
import { OverviewPage } from './pages/OverviewPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { AccountsPage } from './pages/AccountsPage';
import { CardsPage } from './pages/CardsPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { ReportsPage } from './pages/ReportsPage';

export type PageId = 'overview' | 'transactions' | 'accounts' | 'cards' | 'budgets' | 'reports';
type Theme = 'light' | 'dark';
const navigation: { id: PageId; title: string; icon: string }[] = [
  { id: 'overview', title: 'Visão geral', icon: '▦' },
  { id: 'transactions', title: 'Transações', icon: '⇄' },
  { id: 'accounts', title: 'Contas', icon: '▤' },
  { id: 'cards', title: 'Cartões e faturas', icon: '▣' },
  { id: 'budgets', title: 'Orçamentos', icon: '◫' },
  { id: 'reports', title: 'Relatórios', icon: '▥' }
];
function getPage(): PageId {
  const fragment=window.location.hash.replace(/^#/, '');
  return navigation.some(x=>x.id===fragment) ? fragment as PageId : 'overview';
}
const pages: Record<PageId, ComponentType> = {
  overview: OverviewPage,
  transactions: TransactionsPage,
  accounts: AccountsPage,
  cards: CardsPage,
  budgets: BudgetsPage,
  reports: ReportsPage
};
export default function App() {
  const [page, setPage] = useState<PageId>(getPage);
  const [formOpen, setFormOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => window.localStorage.getItem('pf-theme') === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem('pf-theme', theme);
  }, [theme]);
  useEffect(() => {
    const onHashChange=()=>setPage(getPage());
    window.addEventListener('hashchange',onHashChange);
    return ()=>window.removeEventListener('hashchange',onHashChange);
  }, []);
  const CurrentPage=pages[page];
  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#overview" aria-label="Personal Finance — início">
        <span className="brand-mark" aria-hidden="true">◈</span><span>Personal Finance</span>
      </a>
      <nav className="navigation" aria-label="Navegação principal">
        {navigation.map(item=><a key={item.id} href={`#${item.id}`}
          aria-current={page===item.id?'page':undefined} className={page===item.id?'is-active':undefined}>
          <span aria-hidden="true">{item.icon}</span>{item.title}
        </a>)}
      </nav>
      <p className="sidebar-note">Corporate UI v0.5 · Todos os dados são fictícios.</p>
    </aside>
    <main id="conteudo" className="main">
      <div className="app-toolbar">
        <span><Badge>Ambiente demonstrativo</Badge></span>
        <div className="app-toolbar__actions">
          <Button size="sm" variant="secondary" onClick={()=>setTheme(theme==='light'?'dark':'light')}
            aria-label={theme==='light'?'Ativar modo escuro':'Ativar modo claro'}>
            {theme==='light'?'◐ Modo escuro':'☀ Modo claro'}
          </Button>
          <Button size="sm" onClick={()=>setFormOpen(true)}>+ Nova movimentação (demo)</Button>
        </div>
      </div>
      <p className="sample-warning" role="note">
        Valores e instituições fictícios. Esta demonstração não consulta contas, não envia dados e não salva transações.
      </p>
      <CurrentPage/>
    </main>
    <TransactionDemoForm open={formOpen} onClose={()=>setFormOpen(false)}/>
  </div>;
}
