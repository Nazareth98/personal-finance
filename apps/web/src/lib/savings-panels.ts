import { addCompetenceMonths, savingsBoxProgress, type SavingsBox, type SavingsBoxProgress, type SavingsMovement } from '@personal-finance/domain';

/** Ordem de leitura: o que pede ação primeiro, o que já terminou por último. */
export type SavingsStatus = 'behind' | 'ontrack' | 'nodate' | 'done';
const statusOrder: readonly SavingsStatus[] = ['behind', 'ontrack', 'nodate', 'done'];

/** Meses usados na média de aportes: o mês corrente e os dois anteriores. */
export const PACE_WINDOW_MONTHS = 3;

export type SavingsCardView = {
  box: SavingsBox;
  progress: SavingsBoxProgress;
  status: SavingsStatus;
  /** Quanto guardar por mês até a data-alvo, inclusive o mês corrente (mesma regra da previsão). */
  monthlyNeededCents?: bigint;
  /** A data-alvo já passou e ainda falta saldo. */
  overdue: boolean;
  /** Média de aportes líquidos (aportes − resgates) nos últimos três meses. */
  averageNetCents: bigint;
  movements: SavingsMovement[];
};

export type SavingsGroup = { status: SavingsStatus; items: SavingsCardView[] };

export type SavingsPanels = {
  totalBalanceCents: bigint;
  totalTargetCents: bigint;
  totalRemainingCents: bigint;
  monthlyNeededCents: bigint;
  /** Aportes − resgates no mês corrente. */
  netThisMonthCents: bigint;
  groups: SavingsGroup[];
};

function monthsThroughTarget(current: string, targetDate: string) {
  const target = targetDate.slice(0, 7);
  if (target < current) return 0;
  const [startYear, startMonth] = current.split('-').map(Number) as [number, number];
  const [targetYear, targetMonth] = target.split('-').map(Number) as [number, number];
  return (targetYear - startYear) * 12 + targetMonth - startMonth + 1;
}

const signed = (movement: SavingsMovement) => movement.type === 'contribution' ? movement.amountCents : -movement.amountCents;

export function buildSavingsPanels({ boxes, movements, today }: {
  boxes: readonly SavingsBox[];
  movements: readonly SavingsMovement[];
  /** Data local `AAAA-MM-DD`. */
  today: string;
}): SavingsPanels {
  const current = today.slice(0, 7);
  const windowStart = addCompetenceMonths(current, 1 - PACE_WINDOW_MONTHS);
  const cards = boxes.map((box): SavingsCardView => {
    const own = movements.filter(movement => movement.savingsBoxId === box.id)
      .sort((a, b) => b.eventDate.localeCompare(a.eventDate) || b.id.localeCompare(a.id));
    const progress = savingsBoxProgress(box, own);
    const averageNetCents = own
      .filter(movement => movement.eventDate.slice(0, 7) >= windowStart && movement.eventDate.slice(0, 7) <= current)
      .reduce((total, movement) => total + signed(movement), 0n) / BigInt(PACE_WINDOW_MONTHS);
    if (progress.remainingCents === 0n) return { box, progress, status: 'done', overdue: false, averageNetCents, movements: own };
    if (!box.targetDate) return { box, progress, status: 'nodate', overdue: false, averageNetCents, movements: own };
    const months = monthsThroughTarget(current, box.targetDate);
    const monthlyNeededCents = months === 0
      ? progress.remainingCents
      : (progress.remainingCents + BigInt(months) - 1n) / BigInt(months);
    const status = months > 0 && averageNetCents >= monthlyNeededCents ? 'ontrack' : 'behind';
    return { box, progress, status, monthlyNeededCents, overdue: months === 0, averageNetCents, movements: own };
  });

  const groups = statusOrder
    .map(status => ({
      status,
      items: cards.filter(card => card.status === status)
        .sort((a, b) => Number(a.progress.progressBasisPoints - b.progress.progressBasisPoints) || a.box.name.localeCompare(b.box.name, 'pt-BR'))
    }))
    .filter(group => group.items.length > 0);

  return {
    totalBalanceCents: cards.reduce((total, card) => total + card.progress.balanceCents, 0n),
    totalTargetCents: cards.reduce((total, card) => total + card.box.targetCents, 0n),
    totalRemainingCents: cards.reduce((total, card) => total + card.progress.remainingCents, 0n),
    monthlyNeededCents: cards.reduce((total, card) => total + (card.overdue ? 0n : card.monthlyNeededCents ?? 0n), 0n),
    netThisMonthCents: movements
      .filter(movement => movement.eventDate.slice(0, 7) === current && boxes.some(box => box.id === movement.savingsBoxId))
      .reduce((total, movement) => total + signed(movement), 0n),
    groups
  };
}
