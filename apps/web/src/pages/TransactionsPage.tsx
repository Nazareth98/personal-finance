import { Badge } from '@personal-finance/ui';
import { TransactionsDemo } from '../components/TransactionsDemo';
export function TransactionsPage() {
  return <div className="template-page">
    <div className="template-heading"><div><p className="eyebrow">LANÇAMENTOS</p>
      <h1>Transações</h1><p className="muted">Pesquise, filtre e ordene movimentações demonstrativas.</p></div>
      <Badge>Somente leitura</Badge></div>
    <TransactionsDemo/>
  </div>;
}
