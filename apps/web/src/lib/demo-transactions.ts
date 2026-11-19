import { HIDDEN_AMOUNT, valuesHidden } from './privacy.ts';
export type TransactionType='income'|'expense'|'transfer';
export type DemoTransaction={id:string;date:string;description:string;category:string;account:string;kind:TransactionType;amountCents:bigint};
export const demoTransactions:readonly DemoTransaction[]=[
{id:'d01',date:'2026-11-12',description:'Mercado fictício',category:'Alimentação',account:'Conta exemplo',kind:'expense',amountCents:25239n},
{id:'d02',date:'2026-11-11',description:'Remuneração demonstrativa',category:'Salário',account:'Conta exemplo',kind:'income',amountCents:540000n},
{id:'d03',date:'2026-11-10',description:'Internet de teste',category:'Moradia',account:'Conta exemplo',kind:'expense',amountCents:11990n},
{id:'d04',date:'2026-11-09',description:'Transferência interna fictícia',category:'Movimentação própria',account:'Conta exemplo',kind:'transfer',amountCents:30000n},
{id:'d05',date:'2026-11-08',description:'Transporte demonstrativo',category:'Transporte',account:'Conta exemplo',kind:'expense',amountCents:4850n},
{id:'d06',date:'2026-11-07',description:'Freelance fictício',category:'Serviços',account:'Conta exemplo',kind:'income',amountCents:75000n},
{id:'d07',date:'2026-11-06',description:'Cinema ilustrativo',category:'Lazer',account:'Conta exemplo',kind:'expense',amountCents:6500n},
{id:'d08',date:'2026-11-05',description:'Farmácia fictícia',category:'Saúde',account:'Conta exemplo',kind:'expense',amountCents:3299n},
{id:'d09',date:'2026-11-04',description:'Crédito demonstrativo',category:'Outros',account:'Conta exemplo',kind:'income',amountCents:12000n},
{id:'d10',date:'2026-11-03',description:'Academia ilustrativa',category:'Saúde',account:'Conta exemplo',kind:'expense',amountCents:8990n},
{id:'d11',date:'2026-11-02',description:'Transferência reserva fictícia',category:'Movimentação própria',account:'Reserva exemplo',kind:'transfer',amountCents:25000n},
{id:'d12',date:'2026-11-01',description:'Aluguel demonstrativo',category:'Moradia',account:'Conta exemplo',kind:'expense',amountCents:145000n}
];
/** Valor em reais exato a partir de centavos, sempre visível (campos de edição). */
export function formatCentsPlain(cents:bigint):string{
 const neg=cents<0n;const mag=neg?-cents:cents;const full=new Intl.NumberFormat('pt-BR',{useGrouping:true,maximumFractionDigits:0}).format(mag/100n);
 return `${neg?'-':''}R$ ${full},${String(mag%100n).padStart(2,'0')}`;
}
/** Valor para exibição: respeita “ocultar valores” (D-049). */
export function formatCentsBRL(cents:bigint):string{
 return valuesHidden()?HIDDEN_AMOUNT:formatCentsPlain(cents);
}
/** Data bancária `yyyy-MM-dd` → `dd/MM/yyyy`, sem `Date` para não deslocar o dia por fuso. */
export function formatLocalDate(date:string):string{const [year,month,day]=date.split('-');return `${day}/${month}/${year}`;}
const competenceMonths=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
/** Competência `yyyy-MM` → `nov/2026`. */
export function formatCompetence(competence:string):string{const [year,month]=competence.split('-');return `${competenceMonths[Number(month)-1]}/${year}`;}
/** Rótulo curto de eixo: `nov`; janeiro leva o ano (`jan/27`) para marcar a virada. */
export function formatCompetenceAxis(competence:string):string{const [year,month]=competence.split('-');const name=competenceMonths[Number(month)-1];return month==='01'?`${name}/${year.slice(2)}`:name;}
/** Instante operacional (timestamp) → `dd/MM/yyyy, HH:mm` no fuso do navegador. */
export function formatDateTime(value:string):string{return new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value));}
export function transactionKindLabel(kind:TransactionType){return {income:'Receita',expense:'Despesa',transfer:'Transferência'}[kind];}
export type TransactionFilters={query:string;kind:'all'|TransactionType;category:string};
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
export function filterTransactions(rows:readonly DemoTransaction[],filters:TransactionFilters):DemoTransaction[]{
const search=normalize(filters.query);
return rows.filter(row=>(filters.kind==='all'||row.kind===filters.kind)&&(filters.category==='all'||row.category===filters.category)&&(!search||normalize([row.description,row.category,row.account].join(' ')).includes(search)));
}
export function totalsFromTransactions(rows:readonly DemoTransaction[]){
return rows.reduce((sum,row)=>{if(row.kind==='income')sum.income+=row.amountCents;if(row.kind==='expense')sum.expense+=row.amountCents;return sum;},{income:0n,expense:0n});
}
