import {changeLabel,signedRatio} from '../lib/chart-data';
import {ChartDetails} from './ChartDetails';
import {ChartAnnouncement,ChartTooltip,tooltipEdge,useChartFocus} from './ChartInteraction';
import {EmptyState} from './EmptyState';
export type TrendPoint={label:string;valueCents:bigint};
/** `signed` colore resultado por sinal; `neutral` serve a magnitudes sem ganho/perda, como compromissos a pagar. */
export type TrendLineChartProps={data:readonly TrendPoint[];formatValue:(value:bigint)=>string;title?:string;valueTone?:'signed'|'neutral';collapsibleDetails?:boolean};
export function TrendLineChart({data,formatValue,title='Evolução do saldo',valueTone='signed',collapsibleDetails}:TrendLineChartProps){
 const focus=useChartFocus(data.length);
 if(!data.length)return <EmptyState title="Sem valores para a evolução" description="Adicione períodos para consultar a série temporal."/>;
 const max=data.reduce((m,p)=>p.valueCents>m?p.valueCents:m,data[0].valueCents);
 const min=data.reduce((m,p)=>p.valueCents<m?p.valueCents:m,data[0].valueCents);
 const xy=data.map((p,i)=>({x:data.length===1?300:30+i*540/(data.length-1),y:190-155*signedRatio(p.valueCents,min,max)}));
 const path=xy.map((p,i)=>`${i===0?'M':'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
 const zero=min<0n&&max>0n?190-155*signedRatio(0n,min,max):null;
 const text=(value:bigint)=>`${valueTone==='signed'&&value>0n?'+ ':''}${formatValue(value)}`;
 const tone=(value:bigint)=>valueTone==='neutral'?'ui-chart__neutral':value>0n?'ui-chart__positive':value<0n?'ui-chart__negative':'ui-chart__neutral';
 const activeIndex=focus.active;
 const active=activeIndex===null?undefined:data[activeIndex];
 return <figure className="ui-chart" aria-label={title}>
  <div className="ui-trend-plot" role="group" aria-label={`${title}: use as setas para percorrer os períodos`} {...focus.plot}>
   <svg viewBox="0 0 600 220" className="ui-trend-chart" aria-hidden="true" focusable="false">
    {[35,87,139,190].map(y=><line key={y} x1="25" x2="575" y1={y} y2={y} className="ui-trend-chart__grid"/>)}
    {zero!==null?<line x1="25" x2="575" y1={zero} y2={zero} className="ui-trend-chart__zero"/>:null}
    {activeIndex!==null?<line x1={xy[activeIndex]!.x} x2={xy[activeIndex]!.x} y1="25" y2="200" className="ui-trend-chart__guide"/>:null}
    <path d={path} className="ui-trend-chart__line"/>
    {xy.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={i===activeIndex?7:4} className={`ui-trend-chart__point${i===activeIndex?' is-active':''}`}/>)}
   </svg>
   {/* Faixas invisíveis por período: o ponto inteiro do mês é alvo de mouse e toque. */}
   <div className="ui-trend-plot__hits" aria-hidden="true">{data.map((_,i)=><span key={i} {...focus.point(i)}/>)}</div>
   {active&&activeIndex!==null?<ChartTooltip title={active.label} className={`${tooltipEdge(activeIndex,data.length)}${xy[activeIndex]!.y<110?' ui-chart-tooltip--below':''}`}
     style={{left:`${xy[activeIndex]!.x/6}%`,top:`${xy[activeIndex]!.y/2.2}%`}}>
     <strong>{text(active.valueCents)}</strong>{activeIndex>0?<span>{changeLabel(active.valueCents,data[activeIndex-1]!.valueCents)} vs. {data[activeIndex-1]!.label}</span>:null}
   </ChartTooltip>:null}
  </div>
  <ChartAnnouncement text={active?`${active.label}, ${text(active.valueCents)}`:''}/>
  <ChartDetails collapsible={collapsibleDetails}>
   <table className="ui-chart-table" aria-label={`Valores: ${title}`}>
    <thead><tr><th scope="col">Período</th><th scope="col">Valor</th><th scope="col">vs. anterior</th></tr></thead>
    <tbody>{data.map((p,i)=><tr key={i} {...focus.row(i)}><th scope="row">{p.label}</th>
     <td className={tone(p.valueCents)}>{text(p.valueCents)}</td><td>{changeLabel(p.valueCents,data[i-1]?.valueCents)}</td></tr>)}</tbody>
   </table>
  </ChartDetails>
 </figure>;
}
