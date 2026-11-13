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
