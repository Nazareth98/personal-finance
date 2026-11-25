import { buildMonthPlan } from '@personal-finance/domain';
import { Card, Icon, StatusAlertIcon } from '@personal-finance/ui';
import type { LedgerData } from '../ledger/contracts';
import { buildFixedItemsPanel } from '../lib/fixed-panels';
import { formatCentsBRL, formatCompetence } from '../lib/demo-transactions';

/**
 * D-084: “Disponível no mês” na Visão geral — quanto ainda cabe nas metas do mês atual, a sobra do plano e os fixos
 * que ainda não chegaram. Avisa quando o plano do mês não fecha.
 */
export function AvailableMonthCard({ data, today }: { data: LedgerData; today: string }) {
  const month = today.slice(0, 7);
  const plan = buildMonthPlan({ competence: month, today, transactions: data.transactions, fixedItems: data.fixedItems ?? [],
    fixedItemLinks: data.fixedItemLinks ?? [], budgets: data.budgets, installments: data.cardInstallments,
    savingsBoxes: data.savingsBoxes, savingsMovements: data.savingsMovements });
  const spent = new Map<string, bigint>();
  for (const transaction of data.transactions) {
    if (transaction.competence !== month || transaction.reporting !== 'expense' || !transaction.categoryId) continue;
    spent.set(transaction.categoryId, (spent.get(transaction.categoryId) ?? 0n) - transaction.amountCents);
  }
  const roomCents = data.budgets.reduce((sum, budget) => {
    const left = budget.monthlyLimitCents - (spent.get(budget.categoryId) ?? 0n);
    return sum + (left > 0n ? left : 0n);
  }, 0n);
  const fixed = buildFixedItemsPanel({ items: data.fixedItems ?? [], links: data.fixedItemLinks ?? [], transactions: data.transactions, categories: data.categories, today });
  const waiting = fixed.active.filter(row => row.status !== 'done');
  const toPay = waiting.filter(row => row.item.nature === 'expense');
  const toReceive = waiting.filter(row => row.item.nature === 'income');
  const sum = (rows: typeof waiting) => rows.reduce((total, row) => total + row.remainingCents, 0n);
  const late = waiting.filter(row => row.status === 'late').length;
  const negative = plan.leftoverCents < 0n;
  return <Card className="available-month">
    <div className="chart-card__heading"><h2>Disponível em {formatCompetence(month)}</h2><a href="#budgets">Ver plano</a></div>
    {data.budgets.length === 0
      ? <p className="muted">Defina metas em Orçamentos para ver quanto ainda cabe no mês.</p>
      : <div className="available-month__main"><span className="muted">Ainda cabe nas metas</span><strong>{formatCentsBRL(roomCents)}</strong></div>}
    <dl className="available-month__rows">
      <div><dt>Sobra do plano</dt><dd className={negative ? 'transaction-amount--expense' : 'transaction-amount--income'}>
        {negative ? '− ' : ''}{formatCentsBRL(negative ? -plan.leftoverCents : plan.leftoverCents)}</dd></div>
      {(data.fixedItems?.length ?? 0) > 0 && <div><dt>Fixos a pagar{late ? ` · ${late} atrasado${late === 1 ? '' : 's'}` : ''}</dt>
        <dd>{toPay.length ? `${toPay.length}${sum(toPay) > 0n ? ` · ${formatCentsBRL(sum(toPay))}` : ''}` : 'Todos pagos'}</dd></div>}
      {toReceive.length > 0 && <div><dt>Receitas fixas a receber</dt><dd>{toReceive.length}{sum(toReceive) > 0n ? ` · ${formatCentsBRL(sum(toReceive))}` : ''}</dd></div>}
    </dl>
    {negative && <p className="available-month__alert"><Icon icon={StatusAlertIcon} size="sm" />O plano de {formatCompetence(month)} não fecha: metas, compromissos e aportes passam da receita prevista.</p>}
    {(data.fixedItems?.length ?? 0) === 0 && <p className="muted available-month__hint">Marque aluguel, contas e salário como fixos na Revisão para ver o que ainda vai cair no mês.</p>}
  </Card>;
}
