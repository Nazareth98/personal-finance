import {Button} from './Button';
export type PaginationProps={page:number;pageSize:number;totalItems:number;onPageChange:(page:number)=>void};
export function Pagination({page,pageSize,totalItems,onPageChange}:PaginationProps){
const pages=Math.max(1,Math.ceil(totalItems/pageSize));const current=Math.min(Math.max(1,page),pages);
const start=totalItems===0?0:(current-1)*pageSize+1,end=Math.min(totalItems,current*pageSize);
return <nav className="ui-pagination" aria-label="Paginação"><span aria-live="polite">{start}–{end} de {totalItems} registros · Página {current} de {pages}</span><div className="ui-pagination__actions">
<Button variant="secondary" size="sm" disabled={current<=1} onClick={()=>onPageChange(current-1)}>Anterior</Button>
<Button variant="secondary" size="sm" disabled={current>=pages} onClick={()=>onPageChange(current+1)}>Próxima</Button>
</div></nav>;
}
