import {percentage} from '../lib/chart-data';
import {ChartDetails} from './ChartDetails';
import {ChartAnnouncement,ChartTooltip,tooltipEdge,useChartFocus} from './ChartInteraction';
import {EmptyState} from './EmptyState';
export type CashFlowPoint={label:string;axisLabel?:string;incomeCents:bigint;expenseCents:bigint;current?:boolean};
export type CashFlowChartProps={data:readonly CashFlowPoint[];formatValue:(value:bigint)=>string;title?:string;layout?:'horizontal'|'vertical';collapsibleDetails?:boolean};
export function CashFlowChart({data,formatValue,title='Comparativo de receitas e despesas',layout='horizontal',collapsibleDetails}:CashFlowChartProps){
  const current=data.findIndex(p=>p.current);
  const focus=useChartFocus(data.length,current<0?data.length-1:current);
  if(!data.length)return <EmptyState title="Sem dados para o gráfico" description="Adicione períodos para visualizar receitas e despesas."/>;
  const max=data.reduce((m,p)=>p.incomeCents>m?p.incomeCents:m,0n);
  const scale=data.reduce((m,p)=>p.expenseCents>m?p.expenseCents:m,max);
  const result=(p:CashFlowPoint)=>{const v=p.incomeCents-p.expenseCents;return `${v>0n?'+ ':v<0n?'− ':''}${formatValue(v<0n?-v:v)}`;};
  const active=focus.active===null?undefined:data[focus.active];
  const groupClass=(base:string,p:CashFlowPoint,i:number)=>`${base}${p.current?' is-current':''}${i===focus.active?' is-active':''}`;
  const tooltip=(p:CashFlowPoint,i:number)=>i===focus.active?<ChartTooltip title={p.label} className={tooltipEdge(i,data.length)}>
    <span className="ui-chart-tooltip__row"><i className="ui-chart__swatch ui-chart__swatch--income"/>Receitas <strong>{formatValue(p.incomeCents)}</strong></span>
    <span className="ui-chart-tooltip__row"><i className="ui-chart__swatch ui-chart__swatch--expense"/>Despesas <strong>{formatValue(p.expenseCents)}</strong></span>
    <span>Resultado {result(p)}</span>
  </ChartTooltip>:null;
  const plot={role:'group','aria-label':`${title}: use as setas para percorrer os períodos`,...focus.plot};
  return <figure className="ui-chart" aria-label={title}>
    <div className="ui-chart__legend" aria-hidden="true">
      <span><i className="ui-chart__swatch ui-chart__swatch--income"/> Receitas</span>
      <span><i className="ui-chart__swatch ui-chart__swatch--expense"/> Despesas</span>
    </div>
    {layout==='vertical'
      ? <div className={`ui-chart__columns${active?' has-active':''}`} {...plot}>{data.map((p,i)=><div key={i} aria-hidden="true" {...focus.point(i)} className={groupClass('ui-chart__column-group',p,i)}>
        <div className="ui-chart__column-bars">
          {tooltip(p,i)}
          <span className="ui-chart__column ui-chart__bar-fill--income" style={{height:`${percentage(p.incomeCents,scale)}%`}}/>
          <span className="ui-chart__column ui-chart__bar-fill--expense" style={{height:`${percentage(p.expenseCents,scale)}%`}}/>
        </div>
        <span className="ui-chart__column-label">{p.axisLabel??p.label}</span>
      </div>)}</div>
      : <div className={`ui-chart__bars${active?' has-active':''}`} {...plot}>{data.map((p,i)=><div key={i} aria-hidden="true" {...focus.point(i)} className={groupClass('ui-chart__bar-group',p,i)}>
      {tooltip(p,i)}
      <span className="ui-chart__bar-label">{p.label}</span>
      <div className="ui-chart__bar-tracks">
        <div className="ui-chart__bar-track"><span className="ui-chart__bar-fill ui-chart__bar-fill--income" style={{width:`${percentage(p.incomeCents,scale)}%`}}/></div>
        <div className="ui-chart__bar-track"><span className="ui-chart__bar-fill ui-chart__bar-fill--expense" style={{width:`${percentage(p.expenseCents,scale)}%`}}/></div>
      </div>
    </div>)}</div>}
    <ChartAnnouncement text={active?`${active.label}: receitas ${formatValue(active.incomeCents)}, despesas ${formatValue(active.expenseCents)}, resultado ${result(active)}`:''}/>
    <ChartDetails collapsible={collapsibleDetails}>
      <table className="ui-chart-table" aria-label={`Valores: ${title}`}>
        <thead><tr><th scope="col">Período</th><th scope="col">Receitas</th><th scope="col">Despesas</th><th scope="col">Resultado</th></tr></thead>
        <tbody>{data.map((p,i)=><tr key={i} {...focus.row(i)}><th scope="row">{p.label}</th>
          <td className="ui-chart__positive">+ {formatValue(p.incomeCents)}</td><td className="ui-chart__negative">− {formatValue(p.expenseCents)}</td><td>{result(p)}</td></tr>)}</tbody>
      </table>
    </ChartDetails>
  </figure>;
}
