import type { DataTableColumn, SortState } from '../components/DataTable';

export function sortRows<T>(rows: readonly T[], sort: SortState, columns: readonly DataTableColumn<T>[]): T[] {
  if (!sort) return [...rows];
  const column = columns.find(c => c.key===sort.key && c.sortable && c.sortValue);
  if (!column?.sortValue) return [...rows];
  const get=column.sortValue;
  const factor=sort.direction==='asc'?1:-1;
  return rows.map((row,index)=>({row,index})).sort((a,b)=>{
    const av=get(a.row),bv=get(b.row);
    if (av == null && bv == null) return a.index-b.index;
    if (av == null) return 1;
    if (bv == null) return -1;
    let diff=0;
    if(typeof av==='string' && typeof bv==='string') diff=av.localeCompare(bv,'pt-BR',{sensitivity:'base'});
    else if(typeof av==='bigint' && typeof bv==='bigint') diff=av===bv?0:av>bv?1:-1;
    else if(typeof av==='number' && typeof bv==='number') diff=av-bv;
    else diff=String(av).localeCompare(String(bv),'pt-BR');
    return diff===0 ? a.index-b.index : Math.sign(diff)*factor;
  }).map(item=>item.row);
}
export function paginateRows<T>(rows: readonly T[],page:number,pageSize:number):T[] {
  if(!Number.isInteger(page)||page<1||!Number.isInteger(pageSize)||pageSize<1) return [];
  return rows.slice((page-1)*pageSize,page*pageSize);
}
