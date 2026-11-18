import { useState } from 'react';
import { addCompetenceMonths, type CategoryBudget } from '@personal-finance/domain';
import {
  Badge, Button, Card, EditIcon, EmptyState, Icon, MetricCard, NextIcon, PlusIcon, PreviousIcon,
  StatusAlertIcon, StatusOkIcon, StatusPendingIcon, type LucideIcon
} from '@personal-finance/ui';
import { BudgetForm, formatBasisPoints } from '../components/BudgetForm';
import { CategoryIdentityIcon } from '../components/CategoryIdentity';
import type { LedgerState } from '../ledger/useLedger';
import { buildBudgetPanels, type BudgetCardView, type BudgetPace, type BudgetStatus } from '../lib/budget-panels';
import { budgetPercent,budgetRemaining,demoBudgets } from '../lib/demo-finance';
import { formatCentsBRL, formatCompetence } from '../lib/demo-transactions';
import type { PageProps } from './PageProps';

const pad = (value: number) => String(value).padStart(2, '0');
const localToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

type PeriodKind = 'month' | 'year';

const statusCopy: Record<BudgetStatus, { title: string; icon: LucideIcon }> = {
  exceeded: { title: 'Acima do teto', icon: StatusAlertIcon },
  approaching: { title: 'Próximo do teto', icon: StatusPendingIcon },
  within: { title: 'Dentro do teto', icon: StatusOkIcon }
};

function paceText(pace: BudgetPace) {
  if (pace.kind === 'average') return `Média de ${formatCentsBRL(pace.perDayCents)} por dia; o teto permite ${formatCentsBRL(pace.limitPerDayCents)}.`;
  if (pace.perDayCents <= 0n) return 'Teto atingido para o restante do mês.';
  return `Cabem ${formatCentsBRL(pace.perDayCents)} por dia ${pace.days === 1 ? 'até o fim de hoje' : `nos ${pace.days} dias restantes`}.`;
}

function BudgetPeriodControls({ kind, month, onKindChange, onMonthChange }: {
  kind: PeriodKind; month: string; onKindChange: (kind: PeriodKind) => void; onMonthChange: (month: string) => void;
}) {
  const current = localToday().slice(0, 7);
  const step = kind === 'year' ? 12 : 1;
  const isCurrent = kind === 'year' ? month.slice(0, 4) === current.slice(0, 4) : month === current;
  return <div className="budget-toolbar">
    <div className="budget-period-kind" role="group" aria-label="Tipo de período">
      <Button variant={kind === 'month' ? 'secondary' : 'ghost'} size="sm" aria-pressed={kind === 'month'} onClick={() => onKindChange('month')}>Mensal</Button>
      <Button variant={kind === 'year' ? 'secondary' : 'ghost'} size="sm" aria-pressed={kind === 'year'} onClick={() => onKindChange('year')}>Anual</Button>
    </div>
    <div className="period-navigator" role="group" aria-label="Período das metas">
      <Button variant="ghost" size="sm" aria-label={kind === 'year' ? 'Ano anterior' : 'Mês anterior'} onClick={() => onMonthChange(addCompetenceMonths(month, -step))}><Icon icon={PreviousIcon} size="sm" /></Button>
      <strong className="period-navigator__label" aria-live="polite">{kind === 'year' ? `Ano ${month.slice(0, 4)}` : formatCompetence(month)}</strong>
      <Button variant="ghost" size="sm" aria-label={kind === 'year' ? 'Próximo ano' : 'Próximo mês'} onClick={() => onMonthChange(addCompetenceMonths(month, step))}><Icon icon={NextIcon} size="sm" /></Button>
      <Button variant="secondary" size="sm" disabled={isCurrent} onClick={() => onMonthChange(current)}>{kind === 'year' ? 'Ano atual' : 'Mês atual'}</Button>
    </div>
  </div>;
}

function BudgetCard({ item, onEdit }: { item: BudgetCardView; onEdit: () => void }) {
  const { progress, budget, category, name, pace } = item;
  const exceeded = progress.status === 'exceeded';
  const visualPercent = Number(progress.usageBasisPoints > 10000n ? 10000n : progress.usageBasisPoints) / 100;
  return <Card className={`budget-card budget-card--${progress.status}`}>
    <div className="budget-card__top">
      {category ? <CategoryIdentityIcon iconKey={category.iconKey} colorKey={category.colorKey} /> : null}
      <div className="budget-card__title"><h3>{name}</h3>
        <span className="muted">{formatBasisPoints(budget.percentageBasisPoints)} da receita · teto {formatCentsBRL(progress.limitCents)}</span></div>
      <Button variant="ghost" size="sm" aria-label={`Editar meta de ${name}`} onClick={onEdit}><Icon icon={EditIcon} size="sm" /></Button>
    </div>
    <div className="budget-card__result"><span className="muted">{exceeded ? 'Excedente' : 'Disponível'}</span>
      <strong className={exceeded ? 'transaction-amount--expense' : undefined}>{formatCentsBRL(exceeded ? -progress.remainingCents : progress.remainingCents)}</strong></div>
    <progress className={`budget-progress budget-progress--${progress.status}`} max={100} value={visualPercent}
      aria-label={`Uso da meta de ${name}: ${formatBasisPoints(progress.usageBasisPoints)}`} />
    <div className="budget-card__usage"><span className="muted">{formatCentsBRL(progress.usedCents)} utilizados de {formatCentsBRL(progress.limitCents)}</span>
      <strong className={`budget-status--${progress.status}`}>{formatBasisPoints(progress.usageBasisPoints)}</strong></div>
    {pace ? <p className="budget-card__pace muted">{paceText(pace)}</p> : null}
  </Card>;
}

function RealBudgets({ ledger, headerAction }: { ledger: LedgerState; headerAction: PageProps['headerAction'] }) {
  const data = ledger.data;
  const latestMonth = (data?.transactions ?? []).reduce((latest, row) => row.competence > latest ? row.competence : latest, '');
  const [kind, setKind] = useState<PeriodKind>('month');
  const [month, setMonth] = useState('');
  const [form, setForm] = useState<{ budget?: CategoryBudget; categoryId?: string } | null>(null);
  const selectedMonth = month || latestMonth || localToday().slice(0, 7);
  const period = kind === 'year' ? selectedMonth.slice(0, 4) : selectedMonth;
  const panels = buildBudgetPanels({
    budgets: data?.budgets ?? [], categories: data?.categories ?? [], transactions: data?.transactions ?? [], period, today: localToday()
  });
  const transactionsLink = kind === 'month' ? `#transactions?period=${selectedMonth}` : '#transactions';
  const free = 10000 - panels.committedBasisPoints;

  return <div className="template-page">
    <div className="template-heading"><div><p className="eyebrow">PLANEJAMENTO</p><h1>Orçamentos</h1>
      <p className="muted">Tetos por categoria calculados sobre toda receita confirmada do período.</p></div>
      <div className="template-heading__actions"><Button onClick={() => setForm({})}><Icon icon={PlusIcon} size="sm" />Definir meta</Button>{headerAction}</div></div>
    <BudgetPeriodControls kind={kind} month={selectedMonth} onKindChange={setKind} onMonthChange={setMonth} />
    <section className="budget-summary" aria-label="Resumo das metas por categoria">
      <div><span className="muted">Receita confirmada</span><strong className="transaction-amount--income">+ {formatCentsBRL(panels.incomeCents)}</strong><span className="muted">Base de todos os tetos</span></div>
      <div><span className="muted">Comprometido em tetos</span><strong>{formatBasisPoints(panels.committedBasisPoints)}</strong>
        <span className="muted">{formatCentsBRL(panels.totalLimitCents)} · {free > 0 ? `${formatBasisPoints(free)} livre` : 'sem folga'}</span></div>
      <div><span className="muted">Gasto nas metas</span><strong>{panels.totalUsedCents > 0n ? '− ' : ''}{formatCentsBRL(panels.totalUsedCents)}</strong><span className="muted">Somente categorias com meta</span></div>
      <div><span className="muted">Gastos sem meta</span><strong>{panels.unbudgetedTotalCents > 0n ? '− ' : ''}{formatCentsBRL(panels.unbudgetedTotalCents)}</strong>
        <span className="muted">{panels.unbudgeted.length === 1 ? '1 categoria' : `${panels.unbudgeted.length} categorias`}</span></div>
    </section>
    {panels.groups.length === 0
      ? <EmptyState title="Nenhuma meta definida" description="Defina um percentual para acompanhar o teto de uma categoria." action={<Button onClick={() => setForm({})}>Definir primeira meta</Button>} />
      : panels.groups.map(group => {
        const copy = statusCopy[group.status];
        return <section key={group.status} className="budget-group" aria-labelledby={`budget-group-${group.status}`}>
          <h2 id={`budget-group-${group.status}`} className={`budget-group__title budget-status--${group.status}`}>
            <Icon icon={copy.icon} size="sm" />{copy.title}<span className="muted"> · {group.items.length}</span></h2>
          <div className="budget-grid">{group.items.map(item =>
            <BudgetCard key={item.budget.id} item={item} onEdit={() => setForm({ budget: item.budget })} />)}</div>
        </section>;
      })}
    <Card className="budget-unbudgeted">
      <div className="budget-unbudgeted__heading"><h2>Gastos sem meta</h2><a href={transactionsLink}>Ver em Transações</a></div>
      {panels.unbudgeted.length === 0
        ? <p className="muted">Nenhum gasto categorizado fora das metas neste período.</p>
        : <ul aria-label="Categorias com gasto e sem meta">{panels.unbudgeted.map(item => <li key={item.categoryId}>
          <span className="budget-unbudgeted__name">{item.category ? <CategoryIdentityIcon iconKey={item.category.iconKey} colorKey={item.category.colorKey} /> : null}{item.name}</span>
          <span className="budget-unbudgeted__value">− {formatCentsBRL(item.spentCents)}
            {item.category && !item.category.archivedAt && item.category.applicability === 'expense'
              ? <Button variant="secondary" size="sm" aria-label={`Definir meta para ${item.name}`} onClick={() => setForm({ categoryId: item.categoryId })}>Definir meta</Button>
              : null}</span>
        </li>)}</ul>}
    </Card>
    {form && <BudgetForm key={form.budget?.id ?? form.categoryId ?? 'new'} open onClose={() => setForm(null)} ledger={ledger}
      budget={form.budget} initialCategoryId={form.categoryId} />}
  </div>;
}

export function BudgetsPage({ ledger, headerAction }: PageProps) {
  if (ledger) return <RealBudgets ledger={ledger} headerAction={headerAction} />;
  const limit=demoBudgets.reduce((sum,item)=>sum+item.limitCents,0n);
  const used=demoBudgets.reduce((sum,item)=>sum+item.usedCents,0n);
  return <div className="template-page">
    <div className="template-heading"><div><p className="eyebrow">PLANEJAMENTO</p><h1>Orçamentos</h1>
      <p className="muted">Acompanhe limites e excedentes por categoria, usando valores fictícios.</p></div><div className="template-heading__actions"><Badge>Novembro 2026</Badge>{headerAction}</div></div>
    <div className="template-metrics">
      <MetricCard label="Limite total fictício" value={formatCentsBRL(limit)}/>
      <MetricCard label="Consumo ilustrativo" value={formatCentsBRL(used)} tone="expense"/>
      <MetricCard label="Disponível agregado" value={formatCentsBRL(limit>used?limit-used:0n)}
        supportingText="Excedentes por categoria são exibidos separadamente"/>
    </div>
    <div className="template-grid">
      {demoBudgets.map(item=>{
        const remaining=budgetRemaining(item),exceeded=remaining<0n;
        const percent=budgetPercent(item);
        return <Card key={item.id} className="budget-card">
          <div className="budget-card__top"><h2>{item.category}</h2><Badge tone={exceeded?'expense':'neutral'}>{exceeded?'Acima do limite':'Dentro do limite'}</Badge></div>
          <p className="muted">{formatCentsBRL(item.usedCents)} utilizados de {formatCentsBRL(item.limitCents)}</p>
          <progress className={`budget-progress ${exceeded?'budget-progress--exceeded':''}`}
            max={100} value={Math.min(100,percent)}
            aria-label={`Uso do orçamento de ${item.category}: ${percent.toFixed(1).replace('.',',')}%`}/>
          <p className="budget-result">{exceeded? 'Excedente: '+formatCentsBRL(-remaining): 'Disponível: '+formatCentsBRL(remaining)}</p>
        </Card>;
      })}
    </div>
  </div>;
}
