import {useEffect,useRef,useState,type ReactNode} from 'react';
import {ChartSkeleton,type ChartSkeletonProps} from './ChartSkeleton';
import {TableSkeleton,type TableSkeletonProps} from './TableSkeleton';
import {ErrorState} from './ErrorState';

export type DataStatus='success'|'loading'|'error';
export type DataStateProps={
  status:DataStatus;
  children:ReactNode;
  kind:'chart'|'table';
  label?:string;
  errorTitle?:string;
  errorDescription?:string;
  onRetry?:()=>void;
  chartKind?:ChartSkeletonProps['kind'];
  rows?:TableSkeletonProps['rows'];
  columns?:TableSkeletonProps['columns'];
};
/** Tempo mínimo do skeleton (D-041): respostas rápidas não fazem a área piscar. */
export const MIN_SKELETON_MS=300;
function useHeldLoading(status:DataStatus):boolean{
  const [held,setHeld]=useState(status==='loading');
  const startedAt=useRef(status==='loading'?Date.now():0);
  useEffect(()=>{
    if(status==='loading'){startedAt.current=Date.now();setHeld(true);return;}
    const wait=MIN_SKELETON_MS-(Date.now()-startedAt.current);
    if(wait<=0){setHeld(false);return;}
    const timer=setTimeout(()=>setHeld(false),wait);
    return ()=>clearTimeout(timer);
  },[status]);
  return status==='loading'||(held&&status==='success');
}
/** Generic asynchronous visual state. Real data loading remains the caller's responsibility. */
export function DataState({status,children,kind,label,errorTitle,errorDescription,onRetry,chartKind,rows,columns}:DataStateProps){
  const loading=useHeldLoading(status);
  if(loading)return kind==='chart'
    ? <ChartSkeleton title={label??'Carregando gráfico'} kind={chartKind}/>
    : <TableSkeleton label={label??'Carregando registros'} rows={rows} columns={columns}/>;
  if(status==='error')return <ErrorState title={errorTitle} description={errorDescription} onRetry={onRetry}/>;
  return <>{children}</>;
}
