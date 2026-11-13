import {useMemo,useState} from 'react';
import {Badge,Button,Card,DataTable,EmptyState,Input,MetricCard,Pagination,Select,TableSkeleton,sortRows,paginateRows,type DataTableColumn,type SortState} from '@personal-finance/ui';
import {demoTransactions,filterTransactions,formatCentsBRL,formatLocalDate,transactionKindLabel,totalsFromTransactions,type DemoTransaction,type TransactionType} from '../lib/demo-transactions';

const PAGE_SIZE=5;
const columns:DataTableColumn<DemoTransaction>[]=[
{key:'date',header:'Data',sortable:true,sortValue:r=>r.date,cell:r=>formatLocalDate(r.date)},
{key:'description',header:'Descrição',sortable:true,sortValue:r=>r.description,cell:r=><strong>{r.description}</strong>},
{key:'category',header:'Categoria',sortable:true,sortValue:r=>r.category,cell:r=>r.category},
{key:'type',header:'Tipo',sortable:true,sortValue:r=>r.kind,cell:r=><Badge tone={r.kind}>{transactionKindLabel(r.kind)}</Badge>},
{key:'amount',header:'Valor',align:'end',sortable:true,sortValue:r=>r.amountCents,cell:r=>
<span className={`transaction-amount transaction-amount--${r.kind}`}>
{r.kind==='expense'?'− ':r.kind==='income'?'+ ':'↔ '}{formatCentsBRL(r.amountCents)}</span>}
];
const categories=[{value:'all',label:'Todas as categorias'},...Array.from(new Set(demoTransactions.map(x=>x.category))).sort((a,b)=>a.localeCompare(b,'pt-BR')).map(value=>({value,label:value}))];
export function TransactionsDemo(){
const [query,setQuery]=useState(''),[kind,setKind]=useState<'all'|TransactionType>('all'),[category,setCategory]=useState('all');
const [sort,setSort]=useState<SortState>({key:'date',direction:'desc'}),[page,setPage]=useState(1),[loading,setLoading]=useState(false);
const filtered=useMemo(()=>filterTransactions(demoTransactions,{query,kind,category}),[query,kind,category]);
const rows=useMemo(()=>sortRows(filtered,sort,columns),[filtered,sort]);
const currentPage=Math.min(page,Math.max(1,Math.ceil(rows.length/PAGE_SIZE)));
const totals=useMemo(()=>totalsFromTransactions(filtered),[filtered]);
return <section className="transactions-demo" aria-labelledby="transactions-title">
<div className="section-heading"><div><h2 id="transactions-title">Movimentações demonstrativas</h2>
<p className="muted">Pesquisa, filtros e paginação locais; nenhum dado real.</p></div>
<Button variant="secondary" onClick={()=>setLoading(x=>!x)}>{loading?'Exibir dados':'Simular loading'}</Button></div>
<div className="transactions-filters">
<Input label="Pesquisar" placeholder="Descrição, categoria ou conta" value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}}/>
<Select label="Tipo" value={kind} options={[{value:'all',label:'Todos'},{value:'income',label:'Receitas'},{value:'expense',label:'Despesas'},{value:'transfer',label:'Transferências'}]}
onChange={e=>{setKind(e.target.value as 'all'|TransactionType);setPage(1)}}/>
<Select label="Categoria" value={category} options={categories} onChange={e=>{setCategory(e.target.value);setPage(1)}}/>
</div><div className="transactions-metrics" aria-label="Totais dos registros filtrados">
<MetricCard label="Receitas filtradas" value={formatCentsBRL(totals.income)} supportingText="Exclui transferências próprias" tone="income"/>
<MetricCard label="Despesas filtradas" value={formatCentsBRL(totals.expense)} supportingText="Consumo demonstrativo" tone="expense"/>
<MetricCard label="Resultado" value={formatCentsBRL(totals.income-totals.expense)} supportingText="Entradas menos despesas"/>
</div>
<Card className="transactions-table-card">{loading?
<TableSkeleton rows={5} columns={5} label="Carregando movimentações demonstrativas"/>:<>
{rows.length?<DataTable ariaLabel="Tabela de transações fictícias" columns={columns} rows={paginateRows(rows,currentPage,PAGE_SIZE)}
getRowKey={row=>row.id} sort={sort} onSortChange={setSort}/>:
<EmptyState title="Nenhuma movimentação encontrada" description="Altere a busca ou redefina os filtros."
action={<Button variant="secondary" onClick={()=>{setQuery('');setKind('all');setCategory('all');setPage(1)}}>Limpar filtros</Button>}/>}
<Pagination page={currentPage} pageSize={PAGE_SIZE} totalItems={rows.length} onPageChange={setPage}/>
</>}</Card>
</section>;
}
