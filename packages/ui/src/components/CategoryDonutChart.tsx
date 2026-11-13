import {percentage} from '../lib/chart-data';
import {EmptyState} from './EmptyState';
export type CategorySlice={label:string;valueCents:bigint};
export type CategoryDonutChartProps={data:readonly CategorySlice[];formatValue:(value:bigint)=>string;title?:string};
export function CategoryDonutChart({data,formatValue,title='Distribuição das despesas'}:CategoryDonutChartProps){
 // Nonpositive values are invalid donut slices; omit them rather than displaying a negative wedge.
 const positive=data.filter(p=>p.valueCents>0n);
 const total=positive.reduce((sum,p)=>sum+p.valueCents,0n);
 if(total<=0n)return <EmptyState title="Sem despesas no período" description="Não há categorias com valores positivos para representar."/>;
 // Use 0.01%-resolution integer boundaries and a deterministic last segment.
 let start=0;
 const slices=positive.map((p,i)=>{
   const width=i===positive.length-1?100-start:percentage(p.valueCents,total);
   const result={...p,index:i,start,end:Math.min(100,start+width),percent:percentage(clean[i],total)};
   start=result.end;return result;
 });
 const palette=['var(--color-chart-category-1)','var(--color-chart-category-2)','var(--color-chart-category-3)','var(--color-chart-category-4)','var(--color-chart-category-5)'];
 const gradient=`conic-gradient(${slices.map(s=>`${palette[s.index%palette.length]} ${s.start}% ${s.end}%`).join(', ')})`;
 return <figure className="ui-chart" aria-label={title}>
  <div className="ui-donut-chart">
    <div className="ui-donut-chart__ring" style={{background:gradient}} aria-hidden="true">
      <span className="ui-donut-chart__hole"><span>Total</span><strong>{formatValue(total)}</strong></span>
    </div>
    <div className="ui-donut-chart__legend">
      {slices.map(s=><div className="ui-donut-chart__item" key={s.index}>
        <span className={`ui-donut-chart__dot ui-donut-chart__dot--${s.index%5+1}`} aria-hidden="true"/>
        <span>{s.label}</span><strong>{formatValue(s.valueCents)}</strong><span>{s.percent.toFixed(1).replace('.',',')}%</span>
      </div>)}
    </div>
  </div>
  <figcaption className="ui-sr-only">{title}; cada categoria possui valor e participação textual na legenda.</figcaption>
 </figure>;
}
