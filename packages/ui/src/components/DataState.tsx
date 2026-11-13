import type {ReactNode} from 'react';
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
/** Generic asynchronous visual state. Real data loading remains the caller's responsibility. */
export function DataState({status,children,kind,label,errorTitle,errorDescription,onRetry,chartKind,rows,columns}:DataStateProps){
  if(status==='loading')return kind==='chart'
    ? <ChartSkeleton title={label??'Carregando gráfico'} kind={chartKind}/>
    : <TableSkeleton label={label??'Carregando registros'} rows={rows} columns={columns}/>;
  if(status==='error')return <ErrorState title={errorTitle} description={errorDescription} onRetry={onRetry}/>;
  return <>{children}</>;
}
