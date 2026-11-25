/** Chart geometry only: all monetary inputs stay bigint; bounded 0..100 percent is converted for CSS/SVG. */
export function percentage(part:bigint,total:bigint):number {
  if(total<=0n || part<=0n)return 0;
  return Number((part>=total?total:part)*10000n/total)/100;
}
export function signedRatio(value:bigint,min:bigint,max:bigint):number {
  if(max<=min)return .5;
  const clipped=value<min?min:value>max?max:value;
  return Number((clipped-min)*10000n/(max-min))/10000;
}
export type CategoryPart={label:string;valueCents:bigint};
export function categoryPercentages(parts:readonly CategoryPart[]):{label:string;percent:number;index:number}[] {
  const clean=parts.map(p=>p.valueCents>0n?p.valueCents:0n);
  const total=clean.reduce((sum,v)=>sum+v,0n);
  return parts.map((p,index)=>({label:p.label,percent:percentage(clean[index],total),index}));
}
/**
 * Variação contra o período anterior. Com os dois valores positivos: percentual com uma casa (“+12,6%”, “−3%”).
 * Com base zero ou negativa, ou valor negativo, percentual engana (−4.456 → −3.458 viraria “+22,4%”): com `formatValue`,
 * mostra a diferença em dinheiro (“+R$ 997,30”); sem ele, “—”.
 */
export function changeLabel(value:bigint,previous:bigint|undefined,formatValue?:(value:bigint)=>string):string {
  if(previous===undefined)return '—';
  if(previous<=0n||value<0n){
    if(!formatValue)return '—';
    const diff=value-previous;
    return diff===0n?'—':`${diff<0n?'−':'+'}${formatValue(diff<0n?-diff:diff)}`;
  }
  const scaled=(value-previous)*1000n;
  const tenths=(scaled*2n+(scaled<0n?-previous:previous))/(2n*previous);
  if(tenths===0n)return '0%';
  const size=tenths<0n?-tenths:tenths;
  return `${tenths<0n?'−':'+'}${size/10n}${size%10n?`,${size%10n}`:''}%`;
}
