import { Skeleton } from './Skeleton';
export type TableSkeletonProps = {rows?:number;columns?:number;label?:string};
export function TableSkeleton({rows=5,columns=4,label='Carregando registros'}:TableSkeletonProps){
  const rowCount=Math.min(20,Math.max(1,Math.trunc(rows)));
  const colCount=Math.min(12,Math.max(1,Math.trunc(columns)));
  return <div className="ui-table-skeleton" style={{["--ui-skeleton-columns" as string]:colCount}} role="status" aria-label={label} aria-busy="true">
    <span className="ui-sr-only">{label}</span>
    <div className="ui-table-skeleton__header" aria-hidden="true">
      {Array.from({length:colCount},(_,i)=><Skeleton key={i} height="14px" width={i===0?'70%':'60%'}/>)}
    </div>
    {Array.from({length:rowCount},(_,row)=><div className="ui-table-skeleton__row" key={row} aria-hidden="true">
      {Array.from({length:colCount},(_,col)=><Skeleton key={col} height="16px" width={col===0?'86%':col===colCount-1?'60%':'74%'}/>)}
    </div>)}
    <div className="ui-table-skeleton__footer" aria-hidden="true"><Skeleton width="145px" height="14px"/><Skeleton width="172px" height="32px"/></div>
  </div>;
}
