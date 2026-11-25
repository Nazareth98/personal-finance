import { addCompetenceMonths, fixedItemLastValue, fixedItemMonthStatus, type Category, type FixedItem, type FixedItemLink, type FixedItemMonthStatus, type TransactionContract } from '@personal-finance/domain';

export type FixedItemRow = {
  item: FixedItem;
  category?: Category;
  lastCents: bigint;
  lastCompetence?: string;
  /** Previsão do mês seguinte: o último valor, se o fixo está ativo. */
  nextCents: bigint;
  status: FixedItemMonthStatus;
  linkedCount: number;
};

export type FixedItemsPanel = {
  month: string;
  nextMonth: string;
  active: FixedItemRow[];
  ended: FixedItemRow[];
  incomeCents: bigint;
  expenseCents: bigint;
  doneCount: number;
};

/** D-084: aba “Fixos” — receitas primeiro, depois despesas, cada grupo por nome. Totais só dos ativos. */
export function buildFixedItemsPanel(input: {
  items: readonly FixedItem[]; links: readonly FixedItemLink[]; transactions: readonly TransactionContract[];
  categories: readonly Category[]; today: string;
}): FixedItemsPanel {
  const month = input.today.slice(0, 7);
  const categories = new Map(input.categories.map(category => [category.id, category]));
  const rows = input.items.map((item): FixedItemRow => {
    const last = fixedItemLastValue(item.id, input.links, input.transactions);
    return {
      item, ...(item.categoryId && categories.get(item.categoryId) ? { category: categories.get(item.categoryId)! } : {}),
      lastCents: last.cents, ...(last.competence ? { lastCompetence: last.competence } : {}),
      nextCents: item.endedAt ? 0n : last.cents,
      status: fixedItemMonthStatus(item.id, input.links, input.transactions, month, input.today),
      linkedCount: input.links.filter(link => link.fixedItemId === item.id).length
    };
  }).sort((a, b) => Number(a.item.nature === 'expense') - Number(b.item.nature === 'expense') || a.item.name.localeCompare(b.item.name, 'pt-BR'));
  const active = rows.filter(row => !row.item.endedAt);
  const sum = (nature: FixedItem['nature']) => active.filter(row => row.item.nature === nature).reduce((total, row) => total + row.lastCents, 0n);
  return {
    month, nextMonth: addCompetenceMonths(month, 1), active, ended: rows.filter(row => row.item.endedAt),
    incomeCents: sum('income'), expenseCents: sum('expense'), doneCount: active.filter(row => row.status === 'done').length
  };
}

export function fixedStatusLabel(row: Pick<FixedItemRow, 'status' | 'item'>): string {
  if (row.status === 'done') return row.item.nature === 'income' ? 'Recebido' : 'Pago';
  return row.status === 'late' ? 'Atrasado' : 'Pendente';
}
