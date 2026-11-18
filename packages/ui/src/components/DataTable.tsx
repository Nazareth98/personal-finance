import {useState,useSyncExternalStore,type Key,type ReactNode} from 'react';
import {EmptyState} from './EmptyState';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Icon } from './Icon';
import { Select } from './Select';
import { sortRows } from '../lib/table-data';
export type SortDirection='asc'|'desc';
export type SortState={key:string;direction:SortDirection}|null;
/** Papel da coluna na lista compacta abaixo de 680 px; sem nenhum papel declarado a tabela não muda no mobile. */
export type MobileRole='primary'|'detail'|'value'|'field'|'footer'|'hidden';
export type DataTableColumn<T>={key:string;header:string;headerIcon?:LucideIcon;iconTone?:'neutral'|'income'|'expense'|'transfer'|'warning'|'danger';cell:(row:T)=>ReactNode;align?:'start'|'end';sortable?:boolean;sortValue?:(row:T)=>string|number|bigint|null|undefined;mobile?:MobileRole};
const narrowQuery='(max-width: 680px)';
const subscribeNarrow=(notify:()=>void)=>{const media=window.matchMedia(narrowQuery);media.addEventListener('change',notify);return()=>media.removeEventListener('change',notify);};
/** Renderiza só uma forma (tabela ou lista) para não duplicar conteúdo, foco e ações no DOM. */
const useNarrow=()=>useSyncExternalStore(subscribeNarrow,()=>window.matchMedia(narrowQuery).matches,()=>false);
export type DataTableProps<T>={ariaLabel:string;columns:readonly DataTableColumn<T>[];rows:readonly T[];getRowKey:(row:T)=>Key;sort?:SortState;onSortChange?:(next:SortState)=>void;emptyTitle?:string;emptyDescription?:string};
export function DataTable<T>({ariaLabel,columns,rows,getRowKey,sort,onSortChange,emptyTitle='Nenhum resultado',emptyDescription='Altere os filtros e tente novamente.'}:DataTableProps<T>){
// Sem onSortChange a tabela ordena sozinha; tabelas paginadas controlam a ordem para ordenar antes de paginar.
const [localSort,setLocalSort]=useState<SortState>(null);
const activeSort=onSortChange?sort:localSort,changeSort=onSortChange??setLocalSort;
const displayed=onSortChange?rows:sortRows(rows,localSort,columns);
const narrow=useNarrow();
if(rows.length===0)return <EmptyState title={emptyTitle} description={emptyDescription}/>;
const compact=columns.some(col=>col.mobile);
const byRole=(role:MobileRole)=>columns.filter(col=>col.mobile===role);
const sortable=columns.filter(col=>col.sortable);
const table=<div className="ui-table-scroll" role="region" aria-label={ariaLabel} tabIndex={0}>
<table className="ui-table"><caption className="ui-sr-only">{ariaLabel}</caption><thead><tr>
{columns.map(col=>{const active=activeSort?.key===col.key;const heading=<span className="ui-table-heading">{col.headerIcon?<span className={`ui-table-heading__icon ui-table-heading__icon--${col.iconTone??'neutral'}`} aria-hidden="true"><Icon icon={col.headerIcon} size="sm"/></span>:null}{col.header}</span>;return <th scope="col" key={col.key} className={col.align==='end'?'ui-align-end':undefined} aria-sort={col.sortable?(active?(activeSort?.direction==='asc'?'ascending':'descending'):'none'):undefined}>
{col.sortable?<button type="button" className="ui-table-sort" onClick={()=>changeSort({key:col.key,direction:active&&activeSort?.direction==='asc'?'desc':'asc'})}>{heading}<Icon icon={active?(activeSort?.direction==='asc'?ChevronUp:ChevronDown):ChevronsUpDown} size="sm" /></button>:heading}
</th>})}</tr></thead><tbody>{displayed.map(row=><tr key={getRowKey(row)}>{columns.map(col=><td key={col.key} className={col.align==='end'?'ui-align-end':undefined}>{col.cell(row)}</td>)}</tr>)}</tbody>
</table></div>;
if(!compact||!narrow)return table;
return <div className="ui-table-list" role="region" aria-label={ariaLabel}>
{sortable.length?<Select label="Ordenar por" value={activeSort?`${activeSort.key}:${activeSort.direction}`:''}
  options={[{value:'',label:'Ordem padrão'},...sortable.flatMap(col=>[{value:`${col.key}:asc`,label:`${col.header} (crescente)`},{value:`${col.key}:desc`,label:`${col.header} (decrescente)`}])]}
  onChange={event=>{const [key,direction]=event.target.value.split(':');changeSort(key?{key,direction:direction as SortDirection}:null);}}/>:null}
<ul>{displayed.map(row=><li key={getRowKey(row)} className="ui-table-list__item">
<div className="ui-table-list__top">
<div className="ui-table-list__main">
{byRole('primary').map(col=><div key={col.key} className="ui-table-list__primary">{col.cell(row)}</div>)}
{byRole('detail').length?<div className="ui-table-list__detail">{byRole('detail').map(col=><span key={col.key}>{col.cell(row)}</span>)}</div>:null}
</div>
{byRole('value').length?<div className="ui-table-list__value">{byRole('value').map(col=><div key={col.key}>{col.cell(row)}</div>)}</div>:null}
</div>
{byRole('field').length?<dl className="ui-table-list__fields">{byRole('field').map(col=><div key={col.key}><dt>{col.header}</dt><dd>{col.cell(row)}</dd></div>)}</dl>:null}
{byRole('footer').length?<div className="ui-table-list__footer">{byRole('footer').map(col=><div key={col.key}>{col.cell(row)}</div>)}</div>:null}
</li>)}</ul>
</div>;
}
