import { Skeleton } from './Skeleton';
export type ChartSkeletonProps={title?:string;height?:number;kind?:'bars'|'line'|'donut'};
export function ChartSkeleton({title='Carregando gráfico',height=228,kind='bars'}:ChartSkeletonProps){
 const safeHeight=Math.min(600,Math.max(140,Math.trunc(height)));
 return <div className="ui-chart-skeleton" role="status" aria-label={title} aria-busy="true">
 <span className="ui-sr-only">{title}</span>
 <Skeleton width="42%" height="20px"/><Skeleton width="68%" height="12px"/>
 {kind==='donut'?
 <div className="ui-chart-skeleton__donut" style={{height:safeHeight}} aria-hidden="true">
 <span className="ui-chart-skeleton__ring"/>
 <span className="ui-chart-skeleton__legend"><Skeleton width="90%" height="14px"/><Skeleton width="78%" height="14px"/><Skeleton width="63%" height="14px"/></span></div>
 :kind==='line'?
 <div className="ui-chart-skeleton__plot" style={{height:safeHeight}} aria-hidden="true">
  <svg width="100%" height="100%" viewBox="0 0 600 200" preserveAspectRatio="none" className="ui-chart-skeleton__svg">
   {[40,95,150].map(y=><line key={y} x1="0" y1={y} x2="600" y2={y}/>)}
   <path d="M0 160 L110 110 L220 130 L330 70 L440 100 L600 30"/>
  </svg>
 </div>
 :<div className="ui-chart-skeleton__plot" style={{height:safeHeight}} aria-hidden="true">
 {Array.from({length:6},(_,i)=><Skeleton key={i} width="12%" height={`${[45,70,52,85,62,76][i]}%`}/>)}
 </div>}
 </div>;
}
