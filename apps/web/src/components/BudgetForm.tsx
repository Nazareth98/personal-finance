import { useId, useState, type FormEvent } from 'react';
import { addCompetenceMonths, buildMonthPlan, type CategoryBudget } from '@personal-finance/domain';
import { Button, DeleteIcon, Dialog, FormMessage, Icon, Input, StatusAlertIcon, VisualSelect, useToast } from '@personal-finance/ui';
import { categoryOption } from './visual-options';
import type { LedgerState } from '../ledger/useLedger';
import { formatCentsBRL, formatCentsPlain, formatCompetence } from '../lib/demo-transactions';
import { parseBrlCents } from '../lib/transaction-validation';
import { todayIso } from '../lib/review-period';

const centsInput = (cents: bigint) => formatCentsPlain(cents).replace('R$ ', '');

export function formatBasisPoints(value: number | bigint) {
  const basisPoints = BigInt(value);
  const decimals = basisPoints % 100n;
  return `${basisPoints / 100n}${decimals ? `,${decimals.toString().padStart(2, '0')}` : ''}%`;
}

/**
 * Cria, edita ou exclui a meta de uma categoria. Com `budget`, a categoria fica fixa
 * e a exclusão pede confirmação no próprio diálogo. Monte com `key` para reiniciar o estado.
 */
export function BudgetForm({ open, onClose, ledger, budget, initialCategoryId = '', competence }: {
  open: boolean; onClose: () => void; ledger: LedgerState;
  budget?: CategoryBudget; initialCategoryId?: string;
  /** D-084: mês do plano para mostrar o comprometido e a sobra. */
  competence?: string;
}) {
  const [categoryId, setCategoryId] = useState(budget?.categoryId ?? initialCategoryId);
  const [limit, setLimit] = useState(budget ? centsInput(budget.monthlyLimitCents) : '');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const formId = useId();
  const { notify } = useToast();
  const categories = ledger.data?.categories ?? [];
  const budgeted = new Set((ledger.data?.budgets ?? []).map(item => item.categoryId));
  const categoryName = categories.find(category => category.id === budget?.categoryId)?.name ?? 'Categoria indisponível';
  const options = budget
    ? [categories.find(category => category.id === budget.categoryId)].map(category => category ? categoryOption(category)
      : { value: budget.categoryId, label: categoryName, visual: null })
    : categories
      .filter(category => !category.archivedAt && category.applicability === 'expense' && !budgeted.has(category.id))
      .map(categoryOption);
  const title = budget ? `Editar meta de ${categoryName}` : 'Definir meta';

  // D-084: o que já está comprometido na categoria, a média recente e a sobra do mês com esta meta.
  const data = ledger.data;
  const typedCents = parseBrlCents(limit);
  const planFor = (budgets: readonly CategoryBudget[]) => data && competence ? buildMonthPlan({ competence, today: todayIso(), transactions: data.transactions,
    fixedItems: data.fixedItems ?? [], fixedItemLinks: data.fixedItemLinks ?? [], budgets, installments: data.cardInstallments,
    savingsBoxes: data.savingsBoxes, savingsMovements: data.savingsMovements }) : null;
  const otherBudgets = (data?.budgets ?? []).filter(item => item.categoryId !== categoryId);
  const planWithout = planFor(otherBudgets);
  const planWith = categoryId && typedCents !== null && typedCents > 0n
    ? planFor([...otherBudgets, { id: 'draft', categoryId, monthlyLimitCents: typedCents }]) : null;
  const commitment = planWithout?.commitments.find(item => item.categoryId === categoryId);
  const recent = competence ? [1, 2, 3].map(step => addCompetenceMonths(competence, -step)) : [];
  const averageCents = categoryId && recent.length ? (data?.transactions ?? [])
    .filter(item => item.categoryId === categoryId && item.reporting === 'expense' && recent.includes(item.competence))
    .reduce((sum, item) => sum - item.amountCents, 0n) / 3n : 0n;
  const otherBudgetsCents = otherBudgets.reduce((sum, item) => sum + item.monthlyLimitCents, 0n);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const monthlyLimitCents = parseBrlCents(limit);
    if (!categoryId || monthlyLimitCents === null || monthlyLimitCents <= 0n) {
      setError('Selecione uma categoria e informe um teto mensal maior que zero.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await ledger.saveBudget({ categoryId, monthlyLimitCents });
      notify({ message: budget ? 'Meta atualizada.' : 'Meta por categoria salva.', tone: 'success' });
      onClose();
    } catch {
      setError('Não foi possível salvar a meta.');
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!budget) return;
    setLoading(true);
    setError('');
    try {
      await ledger.deleteBudget(budget.categoryId);
      notify({ message: 'Meta excluída.', tone: 'success' });
      onClose();
    } catch {
      setError('Não foi possível excluir a meta.');
    } finally {
      setLoading(false);
    }
  }

  if (confirmingDelete) {
    return <Dialog open={open} onClose={onClose} title="Excluir meta" footer={<>
      <Button variant="ghost" onClick={() => { setConfirmingDelete(false); setError(''); }}>Voltar</Button>
      <Button variant="danger" loading={loading} onClick={() => void remove()}><Icon icon={DeleteIcon} size="sm" />Excluir</Button>
    </>}>
      <p className="ui-dialog__question">Excluir meta de {categoryName}?</p>
      <p className="muted">O teto deixa de ser acompanhado. Lançamentos e a categoria não mudam, e você pode definir a meta de novo depois.</p>
      {error && <FormMessage tone="error">{error}</FormMessage>}
    </Dialog>;
  }

  return <Dialog open={open} onClose={onClose} title={title} description="Teto fixo em reais por mês. Não depende da receita do período." footer={<>
    {budget && <Button variant="ghost" className="budget-form__delete" onClick={() => { setConfirmingDelete(true); setError(''); }}>
      <Icon icon={DeleteIcon} size="sm" />Excluir meta</Button>}
    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
    <Button type="submit" form={formId} loading={loading}>Salvar</Button>
  </>}>
    <form id={formId} className="transaction-form" noValidate onSubmit={submit}>
      <VisualSelect label="Categoria" value={categoryId} options={options} searchable={options.length > 8} required disabled={Boolean(budget)}
        onChange={setCategoryId} />
      <Input label="Teto mensal" startText="R$" value={limit} inputMode="decimal" placeholder="Ex.: 800,00" required
        hint="Quanto você aceita gastar por mês nesta categoria, contando os fixos. Na visão anual, vale 12 vezes." onChange={event => setLimit(event.target.value)} />
      {categoryId && averageCents > 0n && <p className="budget-form__average muted">Média dos últimos 3 meses: {formatCentsBRL(averageCents)} ·{' '}
        <button type="button" className="budget-form__use" onClick={() => setLimit(centsInput(averageCents))}>usar</button></p>}
      {commitment && commitment.totalCents > 0n && <section className="budget-form__commitment" aria-label="Já comprometido nesta categoria">
        <p className="budget-form__commitment-title">Já comprometido em {formatCompetence(competence!)}</p>
        <ul>{commitment.items.map((item, index) => <li key={index}><span>{item.label}</span><span>{formatCentsBRL(item.cents)}</span></li>)}</ul>
        <p className="budget-form__commitment-total"><span>Total</span><span>{formatCentsBRL(commitment.totalCents)}</span></p>
        {typedCents !== null && typedCents > 0n && typedCents < commitment.totalCents && <p className="budget-card__commitment budget-card__commitment--below"><Icon icon={StatusAlertIcon} size="sm" />
          A meta fica {formatCentsBRL(commitment.totalCents - typedCents)} abaixo do comprometido: o mês já começa estourado.</p>}
      </section>}
      {planWithout && <dl className="budget-form__plan">
        <div><dt>Pode distribuir</dt><dd>{planWithout.distributableCents < 0n ? '− ' : ''}{formatCentsBRL(planWithout.distributableCents < 0n ? -planWithout.distributableCents : planWithout.distributableCents)}</dd></div>
        <div><dt>Outras metas</dt><dd>{formatCentsBRL(otherBudgetsCents)}</dd></div>
        <div className={planWith && planWith.leftoverCents < 0n ? 'is-negative' : planWith ? 'is-positive' : ''}><dt>Sobra com esta</dt>
          <dd>{planWith ? `${planWith.leftoverCents < 0n ? '− ' : ''}${formatCentsBRL(planWith.leftoverCents < 0n ? -planWith.leftoverCents : planWith.leftoverCents)}` : '—'}</dd></div>
      </dl>}
      {error && <FormMessage tone="error">{error}</FormMessage>}
    </form>
  </Dialog>;
}
