import {percentage} from '../lib/chart-data';
import {ChartDetails} from './ChartDetails';
import {EmptyState} from './EmptyState';
export type CashFlowPoint={label:string;axisLabel?:string;incomeCents:bigint;expenseCents:bigint;current?:boolean};
export type CashFlowChartProps={data:readonly CashFlowPoint[];formatValue:(value:bigint)=>string;title?:string;layout?:'horizontal'|'vertical';collapsibleDetails?:boolean};
export function CashFlowChart({data,formatValue,title='Comparativo de receitas e despesas',layout='horizontal',collapsibleDetails}:CashFlowChartProps){
  if(!data.length)return <EmptyState title="Sem dados para o gráfico" description="Adicione períodos para visualizar receitas e despesas."/>;
  const max=data.reduce((m,p)=>p.incomeCents>m?p.incomeCents:m,0n);
  const scale=data.reduce((m,p)=>p.expenseCents>m?p.expenseCents:m,max);
  return <figure className="ui-chart" aria-label={title}>
    <div className="ui-chart__legend" aria-hidden="true">
      <span><i className="ui-chart__swatch ui-chart__swatch--income"/> Receitas</span>
      <span><i className="ui-chart__swatch ui-chart__swatch--expense"/> Despesas</span>
    </div>
    {layout==='vertical'
      ? <div className="ui-chart__columns" aria-hidden="true">{data.map((p,i)=><div key={i} className={`ui-chart__column-group${p.current?' is-current':''}`}>
        <div className="ui-chart__column-bars">
          <span className="ui-chart__column ui-chart__bar-fill--income" style={{height:`${percentage(p.incomeCents,scale)}%`}}/>
          <span className="ui-chart__column ui-chart__bar-fill--expense" style={{height:`${percentage(p.expenseCents,scale)}%`}}/>
        </div>
        <span className="ui-chart__column-label">{p.axisLabel??p.label}</span>
      </div>)}</div>
      : <div className="ui-chart__bars" aria-hidden="true">{data.map((p,i)=><div key={i} className="ui-chart__bar-group">
      <span className="ui-chart__bar-label">{p.label}</span>
      <div className="ui-chart__bar-tracks">
        <div className="ui-chart__bar-track"><span className="ui-chart__bar-fill ui-chart__bar-fill--income" style={{width:`${percentage(p.incomeCents,scale)}%`}}/></div>
        <div className="ui-chart__bar-track"><span className="ui-chart__bar-fill ui-chart__bar-fill--expense" style={{width:`${percentage(p.expenseCents,scale)}%`}}/></div>
      </div>
    </div>)}</div>}
    <figcaption className="ui-sr-only">{title}. Valores exatos por período na tabela.</figcaption>
    <table className="ui-sr-only"><thead><tr><th scope="col">Período</th><th scope="col">Receitas</th><th scope="col">Despesas</th></tr></thead>
      <tbody>{data.map((p,i)=><tr key={i}><th scope="row">{p.label}</th><td>{formatValue(p.incomeCents)}</td><td>{formatValue(p.expenseCents)}</td></tr>)}</tbody>
    </table>
    <ChartDetails collapsible={collapsibleDetails}><div className="ui-chart__details">{data.map((p,i)=><div key={i}><strong>{p.label}</strong><span className="ui-chart__positive">+ {formatValue(p.incomeCents)}</span><span className="ui-chart__negative">− {formatValue(p.expenseCents)}</span></div>)}</div></ChartDetails>
  </figure>;
}
