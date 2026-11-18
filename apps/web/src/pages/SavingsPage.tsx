import { useState } from 'react';
import { savingsBoxProgress, type SavingsBox, type SavingsMovement } from '@personal-finance/domain';
import {
  Badge, Button, CalendarIcon, Card, EditIcon, EmptyState, Icon, MetricCard, SavingsIcon,
  StatusOkIcon, StatusPendingIcon, StatusTrendIcon, type LucideIcon
} from '@personal-finance/ui';
import { PageAction } from '../components/PageAction';
import { SavingsBoxForm } from '../components/SavingsBoxForm';
import { SavingsMovementForm } from '../components/SavingsMovementForm';
import { SavingsMovementsDrawer } from '../components/SavingsMovementsDrawer';
import type { LedgerState } from '../ledger/useLedger';
import { formatCentsBRL, formatCompetence, formatLocalDate } from '../lib/demo-transactions';
import { buildSavingsPanels, PACE_WINDOW_MONTHS, type SavingsCardView, type SavingsStatus } from '../lib/savings-panels';
import type { PageProps } from './PageProps';

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

/** Demonstração: mantém o layout anterior para preservar os baselines visuais. */
function DemoSavings({ boxes, movements, ledger, headerAction }: { boxes: SavingsBox[]; movements: SavingsMovement[]; ledger?: LedgerState; headerAction: PageProps['headerAction'] }) {
  const [boxOpen, setBoxOpen] = useState(false);
  const [movementBox, setMovementBox] = useState<SavingsBox | null>(null);
  const [linkBox, setLinkBox] = useState<SavingsBox | null>(null);
  const items = boxes.map(box => ({ box, progress: savingsBoxProgress(box, movements.filter(movement => movement.savingsBoxId === box.id)) }));
  const totalBalance = items.reduce((total, item) => total + item.progress.balanceCents, 0n);
  const totalTarget = items.reduce((total, item) => total + item.box.targetCents, 0n);

  return <div className="template-page">
    <div className="template-heading"><div><p className="eyebrow">PLANEJAMENTO PATRIMONIAL</p><h1>Caixinhas</h1>
      <p className="muted">Aportes e resgates permanecem neutros em renda e consumo.</p></div>
      <div className="template-heading__actions">{ledger ? <Button variant="secondary" onClick={() => setBoxOpen(true)}>Nova caixinha</Button> : <Badge>Dados fictícios</Badge>}{headerAction}</div></div>
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

const pad = (value: number) => String(value).padStart(2, '0');
const localToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const statusCopy: Record<SavingsStatus, { title: string; icon: LucideIcon; tone: string; bar: string }> = {
  behind: { title: 'Abaixo do ritmo', icon: StatusPendingIcon, tone: 'approaching', bar: 'approaching' },
  ontrack: { title: 'No ritmo', icon: StatusTrendIcon, tone: 'within', bar: 'within' },
  nodate: { title: 'Sem data-alvo', icon: CalendarIcon, tone: 'within', bar: 'neutral' },
  done: { title: 'Meta alcançada', icon: StatusOkIcon, tone: 'success', bar: 'success' }
};

function planText(item: SavingsCardView) {
  const { box, progress, status, monthlyNeededCents, averageNetCents, overdue } = item;
  const deadline = box.targetDate ? formatCompetence(box.targetDate.slice(0, 7)) : '';
  if (status === 'done') return 'Meta alcançada. O saldo segue neutro no orçamento até ser resgatado.';
  if (status === 'nodate') return `Faltam ${formatCentsBRL(progress.remainingCents)}. Defina uma data-alvo para calcular quanto guardar por mês.`;
  if (overdue) return `O prazo venceu em ${deadline} e faltam ${formatCentsBRL(progress.remainingCents)}. Edite a data-alvo para recalcular o plano.`;
  return `Guarde ${formatCentsBRL(monthlyNeededCents ?? 0n)} por mês até ${deadline}; a média dos últimos ${PACE_WINDOW_MONTHS} meses é ${formatCentsBRL(averageNetCents)}.`;
}

function SavingsCard({ item, onEdit, onMove, onShowMovements }: {
  item: SavingsCardView; onEdit: () => void; onMove: (type: SavingsMovement['type']) => void; onShowMovements: () => void;
}) {
  const { box, progress, status, movements } = item;
  const copy = statusCopy[status];
  const visualPercent = Number(progress.progressBasisPoints > 10000n ? 10000n : progress.progressBasisPoints) / 100;
  const target = box.targetDate ? `até ${formatCompetence(box.targetDate.slice(0, 7))}` : 'sem data-alvo';
  return <Card className={`budget-card goal-card ${status === 'done' ? 'goal-card--success' : ''}`}>
    <div className="budget-card__top">
      <span className="category-identity__icon category-identity__icon--chart-category-2" aria-hidden="true"><Icon icon={SavingsIcon} size="sm" /></span>
      <div className="budget-card__title"><h3>{box.name}</h3><span className="muted">Meta de {formatCentsBRL(box.targetCents)} · {target}</span></div>
      <Button variant="ghost" size="sm" aria-label={`Editar caixinha ${box.name}`} onClick={onEdit}><Icon icon={EditIcon} size="sm" /></Button>
    </div>
    <div className="budget-card__result"><span className="muted">Guardado</span><strong>{formatCentsBRL(progress.balanceCents)}</strong></div>
    <progress className={`budget-progress budget-progress--${copy.bar}`} max={100} value={visualPercent}
      aria-label={`Progresso da caixinha ${box.name}: ${formatBasisPoints(progress.progressBasisPoints)}`} />
    <div className="budget-card__usage"><span className="muted">{formatCentsBRL(progress.balanceCents)} de {formatCentsBRL(box.targetCents)}</span>
      <strong className={`status-tone--${copy.tone}`}>{formatBasisPoints(progress.progressBasisPoints)}</strong></div>
    <p className="budget-card__pace muted">{planText(item)}</p>
    <div className="goal-card__actions">
      <Button variant="secondary" size="sm" onClick={() => onMove('contribution')}>Aportar</Button>
      <Button variant="secondary" size="sm" disabled={progress.balanceCents === 0n} onClick={() => onMove('withdrawal')}>Resgatar</Button>
      <Button variant="ghost" size="sm" onClick={onShowMovements}>Movimentos · {movements.length}</Button>
    </div>
  </Card>;
}

type SavingsDialog =
  | { kind: 'box'; box?: SavingsBox; hasHistory?: boolean }
  | { kind: 'movement'; box: SavingsBox; type: SavingsMovement['type'] }
  | { kind: 'link'; box: SavingsBox }
  | { kind: 'movements'; item: SavingsCardView };

function RealSavings({ ledger, headerAction }: { ledger: LedgerState; headerAction: PageProps['headerAction'] }) {
  const [dialog, setDialog] = useState<SavingsDialog | null>(null);
  const today = localToday();
  const panels = buildSavingsPanels({ boxes: ledger.data?.savingsBoxes ?? [], movements: ledger.data?.savingsMovements ?? [], today });
  const boxCount = panels.groups.reduce((total, group) => total + group.items.length, 0);
  const savedShare = panels.totalTargetCents > 0n ? (panels.totalBalanceCents * 10000n) / panels.totalTargetCents : 0n;
  const missingThisMonth = panels.monthlyNeededCents - panels.netThisMonthCents;
  const close = () => setDialog(null);

  return <div className="template-page">
    <div className="template-heading"><div><p className="eyebrow">PLANEJAMENTO PATRIMONIAL</p><h1>Caixinhas</h1>
      <p className="muted">Aportes e resgates permanecem neutros em renda e consumo.</p></div>
      <div className="template-heading__actions"><PageAction label="Nova caixinha" onClick={() => setDialog({ kind: 'box' })} />{headerAction}</div></div>
    <section className="summary-strip" aria-label="Resumo das caixinhas">
      <div><span className="muted">Saldo nas caixinhas</span><strong>{formatCentsBRL(panels.totalBalanceCents)}</strong>
        <span className="muted">{boxCount === 1 ? '1 caixinha' : `${boxCount} caixinhas`}</span></div>
      <div><span className="muted">Falta para as metas</span><strong>{formatCentsBRL(panels.totalRemainingCents)}</strong>
        <span className="muted">{formatBasisPoints(savedShare > 10000n ? 10000n : savedShare)} já guardado</span></div>
      <div><span className="muted">Aporte mensal necessário</span><strong>{formatCentsBRL(panels.monthlyNeededCents)}</strong>
        <span className="muted">Só caixinhas com data-alvo</span></div>
      <div><span className="muted">Aportado em {formatCompetence(today.slice(0, 7))}</span>
        <strong>{panels.netThisMonthCents < 0n ? `− ${formatCentsBRL(-panels.netThisMonthCents)}` : formatCentsBRL(panels.netThisMonthCents)}</strong>
        <span className={missingThisMonth > 0n ? 'status-tone--approaching' : 'muted'}>{missingThisMonth > 0n ? `Faltam ${formatCentsBRL(missingThisMonth)} no mês` : 'Plano do mês cumprido'}</span></div>
    </section>
    {panels.groups.length === 0
      ? <EmptyState title="Nenhuma caixinha cadastrada" description="Cadastre a primeira caixinha para acompanhar saldo e progresso."
        action={<Button onClick={() => setDialog({ kind: 'box' })}>Criar caixinha</Button>} />
      : panels.groups.map(group => {
        const copy = statusCopy[group.status];
        return <section key={group.status} className="status-group" aria-labelledby={`savings-group-${group.status}`}>
          <h2 id={`savings-group-${group.status}`} className={`status-group__title status-tone--${copy.tone}`}>
            <Icon icon={copy.icon} size="sm" />{copy.title}<span className="muted"> · {group.items.length}</span></h2>
          <div className="goal-grid">{group.items.map(item => <SavingsCard key={item.box.id} item={item}
            onEdit={() => setDialog({ kind: 'box', box: item.box, hasHistory: item.movements.length > 0 })}
            onMove={type => setDialog({ kind: 'movement', box: item.box, type })}
            onShowMovements={() => setDialog({ kind: 'movements', item })} />)}</div>
        </section>;
      })}
    {dialog?.kind === 'box' && <SavingsBoxForm key={dialog.box?.id ?? 'new'} open onClose={close} ledger={ledger} box={dialog.box} hasHistory={dialog.hasHistory} />}
    {dialog?.kind === 'movement' && <SavingsMovementForm key={`${dialog.box.id}-${dialog.type}`} box={dialog.box} mode="manual" initialType={dialog.type} onClose={close} ledger={ledger} />}
    {dialog?.kind === 'link' && <SavingsMovementForm key={`${dialog.box.id}-link`} box={dialog.box} mode="link" onClose={close} ledger={ledger} />}
    {dialog?.kind === 'movements' && <SavingsMovementsDrawer box={dialog.item.box} movements={dialog.item.movements} ledger={ledger}
      onClose={close} onLink={() => setDialog({ kind: 'link', box: dialog.item.box })} />}
  </div>;
}

export function SavingsPage({ ledger, headerAction }: PageProps) {
  if (ledger) return <RealSavings ledger={ledger} headerAction={headerAction} />;
  return <DemoSavings boxes={demoBoxes} movements={demoMovements} headerAction={headerAction} />;
}
