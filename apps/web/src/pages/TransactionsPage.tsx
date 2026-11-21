import { Badge } from '@personal-finance/ui';
import { TransactionsDemo } from '../components/TransactionsDemo';
import { LedgerTransactions } from '../components/LedgerTransactions';
import type { PageProps } from './PageProps';
export function TransactionsPage({ ledger, headerAction }: PageProps) {
  if (ledger) return <div className="template-page">
    <div className="template-heading"><div><p className="eyebrow">LIVRO FINANCEIRO</p><h1>Transações</h1><p className="muted">Tudo o que entrou e saiu, por mês, ano ou completo. Dinheiro movido entre suas contas não conta duas vezes.</p></div><div className="template-heading__actions">{headerAction}</div></div>
    <LedgerTransactions ledger={ledger}/>
  </div>;
  return <div className="template-page">
    <div className="template-heading"><div><p className="eyebrow">LANÇAMENTOS</p>
      <h1>Transações</h1><p className="muted">Pesquise, filtre e ordene lançamentos de exemplo.</p></div>
      <div className="template-heading__actions"><Badge>Somente leitura</Badge>{headerAction}</div></div>
    <TransactionsDemo/>
  </div>;
}
