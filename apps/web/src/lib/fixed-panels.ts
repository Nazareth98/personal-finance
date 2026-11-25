import { addCompetenceMonths, fixedItemLastValue, fixedItemMonthStatus, fixedItemMonthValue, type Category, type FixedItem, type FixedItemLink, type FixedItemMonthStatus, type TransactionContract } from '@personal-finance/domain';

export type FixedItemRow = {
  item: FixedItem;
  category?: Category;
  lastCents: bigint;
  lastCompetence?: string;
  /** Previsão do mês seguinte: o último valor, se o fixo está ativo. */
  nextCents: bigint;
  status: FixedItemMonthStatus;
  /** O que ainda falta cair no mês: o valor de referência inteiro, se nada caiu; a diferença, se caiu só parte. */
  remainingCents: bigint;
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
    // Referência: o último mês completo antes do atual (o mês em curso pode ter só parte).
    const last = fixedItemLastValue(item.id, input.links, input.transactions, month);
    const status = fixedItemMonthStatus(item.id, input.links, input.transactions, month, input.today);
    const received = fixedItemMonthValue(item.id, input.links, input.transactions, month).cents;
    const remainingCents = status === 'done' ? 0n : status === 'partial' ? (last.cents > received ? last.cents - received : 0n) : last.cents;
    return {
      item, ...(item.categoryId && categories.get(item.categoryId) ? { category: categories.get(item.categoryId)! } : {}),
      lastCents: last.cents, ...(last.competence ? { lastCompetence: last.competence } : {}),
      nextCents: item.endedAt ? 0n : last.cents,
      status, remainingCents,
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
  if (row.status === 'partial') return row.item.nature === 'income' ? 'Recebido em parte' : 'Pago em parte';
  return row.status === 'late' ? 'Atrasado' : 'Pendente';
}
