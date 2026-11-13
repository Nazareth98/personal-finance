import { demoTransactions, type DemoTransaction } from './demo-transactions.ts';
import type { CashFlowPoint, TrendPoint, CategorySlice } from '@personal-finance/ui';
/** Fixtures fictícias, nunca dados bancários ou séries históricas reais. */
export const demoCashFlow:readonly CashFlowPoint[]=[
 {label:'Jun',incomeCents:480000n,expenseCents:340000n},
 {label:'Jul',incomeCents:525000n,expenseCents:365000n},
 {label:'Ago',incomeCents:508000n,expenseCents:310000n},
 {label:'Set',incomeCents:590000n,expenseCents:415000n},
 {label:'Out',incomeCents:555000n,expenseCents:386000n},
 {label:'Nov',incomeCents:627000n,expenseCents:205868n}
];
export function cumulativeNet(points:readonly CashFlowPoint[]):TrendPoint[]{
 let total=0n;
 return points.map(p=>{total+=p.incomeCents-p.expenseCents;return {label:p.label,valueCents:total};});
}
export function expenseCategorySlices(rows:readonly DemoTransaction[]):CategorySlice[]{
 const categories=new Map<string,bigint>();
 for(const row of rows)if(row.kind==='expense')
 categories.set(row.category,(categories.get(row.category)??0n)+row.amountCents);
 return [...categories].map(([label,valueCents])=>({label,valueCents}))
   .sort((a,b)=>a.valueCents===b.valueCents?a.label.localeCompare(b.label,'pt-BR'):a.valueCents>b.valueCents?-1:1);
}
export const demoNetTrend=cumulativeNet(demoCashFlow);
export const demoExpenseSlices=expenseCategorySlices(demoTransactions);
