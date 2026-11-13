import {signedRatio} from '../lib/chart-data';
import {EmptyState} from './EmptyState';
export type TrendPoint={label:string;valueCents:bigint};
export type TrendLineChartProps={data:readonly TrendPoint[];formatValue:(value:bigint)=>string;title?:string};
export function TrendLineChart({data,formatValue,title='Evolução do saldo'}:TrendLineChartProps){
 if(!data.length)return <EmptyState title="Sem valores para a evolução" description="Adicione períodos para consultar a série temporal."/>;
 const max=data.reduce((m,p)=>p.valueCents>m?p.valueCents:m,data[0].valueCents);
 const min=data.reduce((m,p)=>p.valueCents<m?p.valueCents:m,data[0].valueCents);
 const xy=data.map((p,i)=>({x:data.length===1?300:30+i*540/(data.length-1),y:190-155*signedRatio(p.valueCents,min,max)}));
 const path=xy.map((p,i)=>`${i===0?'M':'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
 const zero=min<0n&&max>0n?190-155*signedRatio(0n,min,max):null;
 return <figure className="ui-chart" aria-label={title}>
  <svg viewBox="0 0 600 220" className="ui-trend-chart" aria-hidden="true" focusable="false">
    {[35,87,139,190].map(y=><line key={y} x1="25" x2="575" y1={y} y2={y} className="ui-trend-chart__grid"/>)}
    {zero!==null?<line x1="25" x2="575" y1={zero} y2={zero} className="ui-trend-chart__zero"/>:null}
    <path d={path} className="ui-trend-chart__line"/>
    {xy.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="4" className="ui-trend-chart__point"/>)}
  </svg>
  <figcaption className="ui-sr-only">{title}. Evolução por período detalhada abaixo.</figcaption>
  <div className="ui-chart__details">{data.map((p,i)=><div key={i}><strong>{p.label}</strong>
    <span className={p.valueCents>0n?'ui-chart__positive':p.valueCents<0n?'ui-chart__negative':'ui-chart__neutral'}>
      {p.valueCents>0n?'+ ':''}{formatValue(p.valueCents)}
    </span>
  </div>)}</div>
 </figure>;
}
