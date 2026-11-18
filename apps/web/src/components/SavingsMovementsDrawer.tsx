import type { SavingsBox, SavingsMovement } from '@personal-finance/domain';
import { Button, Dialog, Icon, OpenIcon } from '@personal-finance/ui';
import type { LedgerState } from '../ledger/useLedger';
import { formatCentsBRL, formatLocalDate } from '../lib/demo-transactions';

/**
 * Gaveta com os movimentos de uma caixinha (D-039): folha inferior no mobile e painel lateral no
 * desktop. Cada movimento leva ao lançamento correspondente em Transações.
 */
export function SavingsMovementsDrawer({ box, movements, ledger, onClose, onLink }: {
  box: SavingsBox; movements: readonly SavingsMovement[]; ledger: LedgerState; onClose: () => void; onLink: () => void;
}) {
  const transactions = new Map((ledger.data?.transactions ?? []).map(row => [row.id, row]));
  const accounts = new Map((ledger.data?.accounts ?? []).map(account => [account.id, account.name]));
  const count = movements.length === 1 ? '1 movimento' : `${movements.length} movimentos`;
  return <Dialog open onClose={onClose} className="drawer" title={`Movimentos de ${box.name}`}
    description={`${count} · saldo inicial ${formatCentsBRL(box.openingBalanceCents)}`}>
    <div className="drawer__body">
      <Button variant="secondary" size="sm" onClick={onLink}>Associar lançamento importado</Button>
      {movements.length === 0
        ? <p className="muted">Nenhum aporte ou resgate ainda. Registre um movimento ou associe um lançamento importado.</p>
        : <ul className="savings-movements" aria-label={`Movimentos de ${box.name}`}>{movements.map(movement => {
          const transaction = transactions.get(movement.transactionId);
          const contribution = movement.type === 'contribution';
          const origin = transaction?.source === 'manual' ? 'Manual' : 'Importado';
          const account = transaction ? accounts.get(transaction.accountId) : undefined;
          const link = transaction
            ? `#transactions?period=${transaction.competence}&q=${encodeURIComponent(transaction.description)}`
            : undefined;
          return <li key={movement.id}>
            <span className="savings-movements__date">{formatLocalDate(movement.eventDate)}</span>
            <span className="savings-movements__main">
              <strong>{contribution ? 'Aporte' : 'Resgate'}</strong>
              <span className="muted">{[origin, account, transaction?.description].filter(Boolean).join(' · ')}</span>
              {link && <a href={link} onClick={onClose}><Icon icon={OpenIcon} size="sm" />Ver lançamento</a>}
            </span>
            <strong className="savings-movements__value">{contribution ? '+' : '−'} {formatCentsBRL(movement.amountCents)}</strong>
          </li>;
        })}</ul>}
    </div>
  </Dialog>;
}
