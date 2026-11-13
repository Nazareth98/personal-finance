import { useEffect, useState } from 'react';
import { TransactionDemoForm } from './components/TransactionDemoForm';
import { TransactionsDemo } from './components/TransactionsDemo';
import { Badge, Button, Card } from '@personal-finance/ui';

type Theme = 'light' | 'dark';
const formatMoney = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const activity = [
  { label: 'Salário demonstrativo', category: 'Receita', value: 6800, tone: 'income' as const },
  { label: 'Moradia demonstrativa', category: 'Despesa', value: -1850, tone: 'expense' as const },
  { label: 'Transferência entre contas', category: 'Movimentação própria', value: -400, tone: 'transfer' as const }
];

export default function App() {
  const [formOpen, setFormOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => window.localStorage.getItem('pf-theme') === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem('pf-theme', theme);
  }, [theme]);

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Navegação principal">
        <div className="brand"><span className="brand-mark">◈</span><span>Personal Finance</span></div>
        <nav className="navigation">
          <a href="#visao-geral" aria-current="page">Visão geral</a>
          <span>Transações</span><span>Contas e cartões</span><span>Orçamentos</span><span>Relatórios</span>
        </nav>
        <p className="sidebar-note">Base visual de demonstração · sem integração bancária.</p>
      </aside>
      <main className="main" id="visao-geral">
        <div className="topbar">
          <div><p className="eyebrow">PAINEL FINANCEIRO</p><h1>Visão geral</h1><p className="muted">Um retrato claro das suas finanças.</p></div>
          <Button variant="secondary" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label={theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro'}>
            {theme === 'light' ? '◐ Tema escuro' : '☼ Tema claro'}
          </Button>
        </div>
        <div className="demo-action"><Button onClick={() => setFormOpen(true)}>+ Nova movimentação (demo)</Button></div>
        <p className="sample-warning" role="note">Os valores abaixo são fictícios e servem somente para demonstrar o Design System.</p>
        <section className="metrics" aria-label="Indicadores">
          <Card><p className="metric-label">Saldo consolidado</p><strong className="metric-value">{formatMoney(24850)}</strong><Badge tone="income">+8,2% no período</Badge></Card>
          <Card><p className="metric-label">Receitas</p><strong className="metric-value">{formatMoney(6800)}</strong><Badge tone="income">Entrada de recursos</Badge></Card>
          <Card><p className="metric-label">Despesas</p><strong className="metric-value">{formatMoney(3420)}</strong><Badge tone="expense">Saída de recursos</Badge></Card>
        </section>
        <section className="content-grid">
          <Card>
            <h2>Resumo do mês</h2><p className="muted">Distribuição de receitas e despesas demonstrativas</p>
            <div className="bar-row"><span>Receitas</span><div className="bar-track"><div className="bar-fill income" style={{ width: '100%' }} /></div><strong>{formatMoney(6800)}</strong></div>
            <div className="bar-row"><span>Despesas</span><div className="bar-track"><div className="bar-fill expense" style={{ width: '50.3%' }} /></div><strong>{formatMoney(3420)}</strong></div>
          </Card>
          <Card>
            <div className="section-heading"><h2>Movimentações recentes</h2><Badge>Exemplo</Badge></div>
            <div className="activity-list">{activity.map((item) => (
              <div className="activity" key={item.label}>
                <div><strong>{item.label}</strong><p className="muted">{item.category}</p></div>
                <span className={`activity-value ${item.tone}`}>{formatMoney(item.value)}</span>
              </div>
            ))}</div>
            <p className="muted footnote">Transferências próprias não devem ser interpretadas como despesas.</p>
          </Card>
        </section>
        <TransactionsDemo />
      </main>
      <TransactionDemoForm open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
