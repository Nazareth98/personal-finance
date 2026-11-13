import { Badge } from '@personal-finance/ui';
import { TransactionsDemo } from '../components/TransactionsDemo';
import { LedgerTransactions } from '../components/LedgerTransactions';
import type { LedgerState } from '../ledger/useLedger';
export function TransactionsPage({ ledger }: { ledger?: LedgerState }) {
  if (ledger) return <div className="template-page">
    <div className="template-heading"><div><p className="eyebrow">LIVRO FINANCEIRO</p><h1>Transações</h1><p className="muted">Visão mensal, anual e completa, sem dupla contagem de movimentos patrimoniais.</p></div><Badge>Dados pessoais</Badge></div>
    <LedgerTransactions ledger={ledger}/>
  </div>;
  return <div className="template-page">
    <div className="template-heading"><div><p className="eyebrow">LANÇAMENTOS</p>
      <h1>Transações</h1><p className="muted">Pesquise, filtre e ordene movimentações demonstrativas.</p></div>
      <Badge>Somente leitura</Badge></div>
    <TransactionsDemo/>
  </div>;
}
