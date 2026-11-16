import { Badge } from '@personal-finance/ui';
import { TransactionsDemo } from '../components/TransactionsDemo';
import { LedgerTransactions } from '../components/LedgerTransactions';
import type { PageProps } from './PageProps';
export function TransactionsPage({ ledger, headerAction }: PageProps) {
  if (ledger) return <div className="template-page">
    <div className="template-heading"><div><p className="eyebrow">LIVRO FINANCEIRO</p><h1>Transações</h1><p className="muted">Visão mensal, anual e completa, sem dupla contagem de movimentos patrimoniais.</p></div><div className="template-heading__actions"><Badge>Dados pessoais</Badge>{headerAction}</div></div>
    <LedgerTransactions ledger={ledger}/>
  </div>;
  return <div className="template-page">
    <div className="template-heading"><div><p className="eyebrow">LANÇAMENTOS</p>
      <h1>Transações</h1><p className="muted">Pesquise, filtre e ordene movimentações demonstrativas.</p></div>
      <div className="template-heading__actions"><Badge>Somente leitura</Badge>{headerAction}</div></div>
    <TransactionsDemo/>
  </div>;
}
