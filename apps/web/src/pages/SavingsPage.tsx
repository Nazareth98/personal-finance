import { useState } from 'react';
import { savingsBoxProgress, type SavingsBox, type SavingsMovement } from '@personal-finance/domain';
import { Badge, Button, Card, EmptyState, MetricCard } from '@personal-finance/ui';
import { SavingsBoxForm } from '../components/SavingsBoxForm';
import { SavingsMovementForm } from '../components/SavingsMovementForm';
import type { LedgerState } from '../ledger/useLedger';
import { formatCentsBRL, formatLocalDate } from '../lib/demo-transactions';

const demoBoxes: SavingsBox[] = [
  { id: 'demo-box', name: 'Reserva de emergência', openingBalanceCents: 200000n, targetCents: 1200000n, targetDate: '2027-12-31' }
];
const demoMovements: SavingsMovement[] = [
  { id: 'demo-movement', savingsBoxId: 'demo-box', transactionId: 'demo-transaction', type: 'contribution', amountCents: 150000n, eventDate: '2026-11-08' }
];

function formatBasisPoints(value: bigint) {
  const decimals = value % 100n;
  return `${value / 100n}${decimals ? `,${decimals.toString().padStart(2, '0')}` : ''}%`;
}

function SavingsContent({ boxes, movements, ledger }: { boxes: SavingsBox[]; movements: SavingsMovement[]; ledger?: LedgerState }) {
  const [boxOpen, setBoxOpen] = useState(false);
  const [movementBox, setMovementBox] = useState<SavingsBox | null>(null);
  const [linkBox, setLinkBox] = useState<SavingsBox | null>(null);
  const items = boxes.map(box => ({ box, progress: savingsBoxProgress(box, movements.filter(movement => movement.savingsBoxId === box.id)) }));
  const totalBalance = items.reduce((total, item) => total + item.progress.balanceCents, 0n);
  const totalTarget = items.reduce((total, item) => total + item.box.targetCents, 0n);

  return <div className="template-page">
    <div className="template-heading"><div><p className="eyebrow">PLANEJAMENTO PATRIMONIAL</p><h1>Caixinhas</h1>
      <p className="muted">Aportes e resgates permanecem neutros em renda e consumo.</p></div>
      {ledger ? <Button onClick={() => setBoxOpen(true)}>Nova caixinha</Button> : <Badge>Dados fictícios</Badge>}</div>
    <div className="template-metrics" aria-label="Resumo das caixinhas">
      <MetricCard label="Saldo nas caixinhas" value={formatCentsBRL(totalBalance)} supportingText="Saldo inicial mais movimentos" />
      <MetricCard label="Metas cadastradas" value={formatCentsBRL(totalTarget)} supportingText={`${boxes.length} caixinha${boxes.length === 1 ? '' : 's'}`} />
      <MetricCard label="Movimentos vinculados" value={String(movements.length)} supportingText="Aportes e resgates rastreáveis" />
    </div>
    {items.length === 0
      ? <EmptyState title="Nenhuma caixinha cadastrada" description="Cadastre a primeira caixinha para acompanhar saldo e progresso." action={ledger ? <Button onClick={() => setBoxOpen(true)}>Criar caixinha</Button> : undefined} />
      : <div className="template-grid">{items.map(({ box, progress }) => {
        const visualPercent = Number(progress.progressBasisPoints > 10000n ? 10000n : progress.progressBasisPoints) / 100;
        const boxMovements = movements.filter(movement => movement.savingsBoxId === box.id);
        return <Card key={box.id} className="budget-card">
          <div className="budget-card__top"><div><h2>{box.name}</h2><span className="muted">{box.targetDate ? `Meta para ${formatLocalDate(box.targetDate)}` : 'Sem data-alvo'}</span></div>
            <Badge tone={progress.remainingCents === 0n ? 'income' : 'neutral'}>{progress.remainingCents === 0n ? 'Meta alcançada' : 'Em andamento'}</Badge></div>
          <p className="muted">{formatCentsBRL(progress.balanceCents)} de {formatCentsBRL(box.targetCents)}</p>
          <progress className="budget-progress" max={100} value={visualPercent}
            aria-label={`Progresso da caixinha ${box.name}: ${formatBasisPoints(progress.progressBasisPoints)}`} />
          <p className="budget-result">Faltam {formatCentsBRL(progress.remainingCents)}</p>
          <div className="summary-row"><span>Aportes</span><strong>{formatCentsBRL(progress.contributionCents)}</strong></div>
          <div className="summary-row"><span>Resgates</span><strong>{formatCentsBRL(progress.withdrawalCents)}</strong></div>
          <div className="summary-row"><span>Movimentos</span><strong>{boxMovements.length}</strong></div>
          {ledger && <div className="savings-card-actions"><Button size="sm" variant="secondary" onClick={() => setMovementBox(box)}>Registrar movimento</Button>
            <Button size="sm" variant="ghost" onClick={() => setLinkBox(box)}>Associar importado</Button></div>}
        </Card>;
      })}</div>}
    {ledger && <>
      <SavingsBoxForm open={boxOpen} onClose={() => setBoxOpen(false)} ledger={ledger} />
      <SavingsMovementForm box={movementBox} mode="manual" onClose={() => setMovementBox(null)} ledger={ledger} />
      <SavingsMovementForm box={linkBox} mode="link" onClose={() => setLinkBox(null)} ledger={ledger} />
    </>}
  </div>;
}

export function SavingsPage({ ledger }: { ledger?: LedgerState }) {
  return <SavingsContent
    boxes={ledger ? ledger.data?.savingsBoxes ?? [] : demoBoxes}
    movements={ledger ? ledger.data?.savingsMovements ?? [] : demoMovements}
    ledger={ledger}
  />;
}
