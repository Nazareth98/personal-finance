import { useState } from 'react';
import type { FixedItem } from '@personal-finance/domain';
import { Badge, Button, CategoryRepeatIcon, DataTable, EditIcon, EmptyState, Icon, type DataTableColumn } from '@personal-finance/ui';
import type { LedgerState } from '../ledger/useLedger';
import { buildFixedItemsPanel, fixedStatusLabel, type FixedItemRow } from '../lib/fixed-panels';
import { formatCentsBRL, formatCompetence } from '../lib/demo-transactions';
import { CategoryIdentityIcon } from './CategoryIdentity';
import { FixedItemForm } from './FixedItemForm';
import { OptionTile } from './visual-options';

const statusTone = { done: 'income', pending: 'neutral', late: 'expense' } as const;

/** D-084: aba “Fixos” de Orçamentos — o que se repete todo mês, último valor, previsão e situação no mês. */
export function FixedItemsPanel({ ledger, today }: { ledger: LedgerState; today: string }) {
  const data = ledger.data;
  const [editing, setEditing] = useState<FixedItem | null>(null);
  const [showEnded, setShowEnded] = useState(false);
  const panel = buildFixedItemsPanel({ items: data?.fixedItems ?? [], links: data?.fixedItemLinks ?? [],
    transactions: data?.transactions ?? [], categories: data?.categories ?? [], today });
  const money = (row: FixedItemRow, cents: bigint) => `${row.item.nature === 'income' ? '+' : '−'} ${formatCentsBRL(cents)}`;
  const columns: DataTableColumn<FixedItemRow>[] = [
    { key: 'name', header: 'Fixo', mobile: 'primary', sortable: true, sortValue: row => row.item.name,
      cell: row => <span className="fixed-item-name">{row.category
        ? <CategoryIdentityIcon iconKey={row.category.iconKey} colorKey={row.category.colorKey} />
        : <OptionTile icon={CategoryRepeatIcon} />}
        <span><strong>{row.item.name}</strong><span className="muted">{row.item.nature === 'income' ? 'Receita' : 'Despesa'} · {row.category?.name ?? 'Sem categoria'} · {row.linkedCount} {row.linkedCount === 1 ? 'lançamento' : 'lançamentos'}</span></span></span> },
    { key: 'last', header: 'Último valor', align: 'end', mobile: 'value', sortable: true, sortValue: row => row.lastCents,
      cell: row => row.lastCompetence
        ? <span className="fixed-item-amount"><strong className={row.item.nature === 'income' ? 'transaction-amount--income' : undefined}>{money(row, row.lastCents)}</strong><span className="muted">{formatCompetence(row.lastCompetence)}</span></span>
        : <span className="muted">—</span> },
    { key: 'next', header: `Previsto em ${formatCompetence(panel.nextMonth)}`, align: 'end', mobile: 'detail',
      cell: row => row.item.endedAt ? <span className="muted">Encerrado</span> : <span>{formatCentsBRL(row.nextCents)}</span> },
    { key: 'status', header: formatCompetence(panel.month), mobile: 'detail',
      cell: row => row.item.endedAt ? <Badge>Encerrado</Badge> : <Badge tone={statusTone[row.status]}>{fixedStatusLabel(row)}</Badge> },
    { key: 'actions', header: 'Ações', align: 'end', mobile: 'footer',
      cell: row => <Button variant="ghost" size="sm" aria-label={`Editar fixo ${row.item.name}`} onClick={() => setEditing(row.item)}><Icon icon={EditIcon} size="sm" /></Button> }
  ];

  if (!data?.fixedItems) return <EmptyState title="Fixos ainda não disponíveis" description="Esta instância ainda não recebeu a atualização de fixos. Ela chega sozinha na próxima publicação." />;
  return <div className="fixed-items">
    <section className="summary-strip" aria-label="Resumo dos fixos">
      <div><span className="muted">Receitas fixas</span><strong className="transaction-amount--income">+ {formatCentsBRL(panel.incomeCents)}</strong><span className="muted">Por mês, pelo último valor</span></div>
      <div><span className="muted">Despesas fixas</span><strong>− {formatCentsBRL(panel.expenseCents)}</strong><span className="muted">Por mês, pelo último valor</span></div>
      <div><span className="muted">Em {formatCompetence(panel.month)}</span><strong>{panel.doneCount} de {panel.active.length}</strong><span className="muted">já chegaram</span></div>
    </section>
    <p className="muted">Fixos são criados na Revisão, no campo “Lançamento fixo”. A previsão de cada um usa o valor do último mês.</p>
    {panel.active.length === 0
      ? <EmptyState title="Nenhum fixo ainda" description="Na Revisão, marque o aluguel, a conta de luz ou o salário como lançamento fixo." action={<a href="#review">Abrir Revisão</a>} />
      : <DataTable ariaLabel="Fixos ativos" columns={columns} rows={panel.active} getRowKey={row => row.item.id} />}
    {panel.ended.length > 0 && <section className="fixed-items__ended">
      <Button variant="ghost" size="sm" aria-expanded={showEnded} onClick={() => setShowEnded(value => !value)}>
        {showEnded ? 'Ocultar' : 'Ver'} encerrados · {panel.ended.length}</Button>
      {showEnded && <DataTable ariaLabel="Fixos encerrados" columns={columns} rows={panel.ended} getRowKey={row => row.item.id} />}
    </section>}
    <FixedItemForm item={editing} onClose={() => setEditing(null)} ledger={ledger} />
  </div>;
}
