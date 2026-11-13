import { type Key, type ReactNode } from 'react';
import { EmptyState } from './EmptyState';

export type SortDirection = 'asc' | 'desc';
export type SortState = { key: string; direction: SortDirection } | null;
export type DataTableColumn<T> = {
  key: string;
  header: string;
  cell: (item: T) => ReactNode;
  align?: 'start' | 'end';
  sortable?: boolean;
  sortValue?: (item: T) => string | number | bigint | null | undefined;
};
export type DataTableProps<T> = {
  ariaLabel: string;
  columns: readonly DataTableColumn<T>[];
  rows: readonly T[];
  getRowKey: (item: T) => Key;
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
  emptyTitle?: string;
  emptyDescription?: string;
};

export function DataTable<T>({
  ariaLabel, columns, rows, getRowKey, sort, onSortChange,
  emptyTitle = 'Nenhum resultado encontrado',
  emptyDescription = 'Ajuste os filtros para encontrar outras movimentações.'
}: DataTableProps<T>) {
  if (!rows.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }
  return (
    <div className="ui-table-scroll" role="region" aria-label={ariaLabel} tabIndex={0}>
      <table className="ui-table">
        <caption className="ui-sr-only">{ariaLabel}</caption>
        <thead><tr>{columns.map(column => {
          const active = sort?.key === column.key;
          return <th key={column.key} scope="col"
            className={column.align === 'end' ? 'ui-align-end' : undefined}
            aria-sort={column.sortable ? (active ? (sort?.direction === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}>
            {column.sortable && onSortChange ? (
              <button type="button" className="ui-table-sort"
                onClick={() => onSortChange({ key: column.key, direction: active && sort?.direction === 'asc' ? 'desc' : 'asc' })}>
                {column.header} <span aria-hidden="true">{active ? sort?.direction === 'asc' ? '↑' : '↓' : '↕'}</span>
              </button>
            ) : column.header}
          </th>;
        })}</tr></thead>
        <tbody>{rows.map(row => <tr key={getRowKey(row)}>
          {columns.map(column => <td key={column.key}
            className={column.align === 'end' ? 'ui-align-end' : undefined}>{column.cell(row)}</td>)}
        </tr>)}</tbody>
      </table>
    </div>
  );
}
