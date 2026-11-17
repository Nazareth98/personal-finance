import type {Key,ReactNode} from 'react';
import {EmptyState} from './EmptyState';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Icon } from './Icon';
export type SortDirection='asc'|'desc';
export type SortState={key:string;direction:SortDirection}|null;
export type DataTableColumn<T>={key:string;header:string;headerIcon?:LucideIcon;iconTone?:'neutral'|'income'|'expense'|'transfer'|'warning'|'danger';cell:(row:T)=>ReactNode;align?:'start'|'end';sortable?:boolean;sortValue?:(row:T)=>string|number|bigint|null|undefined};
export type DataTableProps<T>={ariaLabel:string;columns:readonly DataTableColumn<T>[];rows:readonly T[];getRowKey:(row:T)=>Key;sort?:SortState;onSortChange?:(next:SortState)=>void;emptyTitle?:string;emptyDescription?:string};
export function DataTable<T>({ariaLabel,columns,rows,getRowKey,sort,onSortChange,emptyTitle='Nenhum resultado',emptyDescription='Altere os filtros e tente novamente.'}:DataTableProps<T>){
if(rows.length===0)return <EmptyState title={emptyTitle} description={emptyDescription}/>;
return <div className="ui-table-scroll" role="region" aria-label={ariaLabel} tabIndex={0}>
<table className="ui-table"><caption className="ui-sr-only">{ariaLabel}</caption><thead><tr>
{columns.map(col=>{const active=sort?.key===col.key;const heading=<span className="ui-table-heading">{col.headerIcon?<span className={`ui-table-heading__icon ui-table-heading__icon--${col.iconTone??'neutral'}`} aria-hidden="true"><Icon icon={col.headerIcon} size="sm"/></span>:null}{col.header}</span>;return <th scope="col" key={col.key} className={col.align==='end'?'ui-align-end':undefined} aria-sort={col.sortable?(active?(sort?.direction==='asc'?'ascending':'descending'):'none'):undefined}>
{col.sortable&&onSortChange?<button type="button" className="ui-table-sort" onClick={()=>onSortChange({key:col.key,direction:active&&sort?.direction==='asc'?'desc':'asc'})}>{heading}<Icon icon={active?(sort?.direction==='asc'?ChevronUp:ChevronDown):ChevronsUpDown} size="sm" /></button>:heading}
</th>})}</tr></thead><tbody>{rows.map(row=><tr key={getRowKey(row)}>{columns.map(col=><td key={col.key} className={col.align==='end'?'ui-align-end':undefined}>{col.cell(row)}</td>)}</tr>)}</tbody>
</table></div>;
}
