import { useMemo,useState } from 'react';
import { Badge,Button,Card,DataTable,EmptyState,Input,MetricCard,Pagination,Select,Skeleton,sortRows,paginateRows,
  type DataTableColumn,type SortState } from '@personal-finance/ui';
import { demoTransactions,filterTransactions,formatCentsBRL,formatLocalDate,transactionKindLabel,totalsFromTransactions,
  type DemoTransaction,type TransactionType } from '../lib/demo-transactions';

const PAGE_SIZE=5;
const columns:DataTableColumn<DemoTransaction>[]=[
  {key:'date',header:'Data',sortable:true,sortValue:row=>row.date,cell:row=>formatLocalDate(row.date)},
  {key:'description',header:'Descrição',sortable:true,sortValue:row=>row.description,cell:row=><strong>{row.description}</strong>},
  {key:'category',header:'Categoria',sortable:true,sortValue:row=>row.category,cell:row=>row.category},
  {key:'type',header:'Tipo',sortable:true,sortValue:row=>row.kind,cell:row=>
    <Badge tone={row.kind}>{transactionKindLabel(row.kind)}</Badge>},
  {key:'amount',header:'Valor',align:'end',sortable:true,sortValue:row=>row.amountCents,
    cell:row=><span className={`transaction-amount transaction-amount--${row.kind}`}>
      {row.kind==='expense'?'− ':row.kind==='income'?'+ ':'↔ '}{formatCentsBRL(row.amountCents)}
    </span>}
];
const categories=[{value:'all',label:'Todas as categorias'},...Array.from(new Set(demoTransactions.map(x=>x.category))).sort((a,b)=>a.localeCompare(b,'pt-BR')).map(value=>({value,label:value}))];

export function TransactionsDemo(){
  const [query,setQuery]=useState('');
  const [kind,setKind]=useState<'all'|TransactionType>('all');
  const [category,setCategory]=useState('all');
  const [sort,setSort]=useState<SortState>({key:'date',direction:'desc'});
  const [page,setPage]=useState(1);
  const [loading,setLoading]=useState(false);
  const filtered=useMemo(()=>filterTransactions(demoTransactions,{query,kind,category}),[query,kind,category]);
  const rows=useMemo(()=>sortRows(filtered,sort,columns),[filtered,sort]);
  const currentPage=Math.min(page,Math.max(1,Math.ceil(rows.length/PAGE_SIZE)));
  const totals=useMemo(()=>totalsFromTransactions(filtered),[filtered]);
  const resetPage=()=>setPage(1);
  return <section className="transactions-demo" aria-labelledby="transactions-title">
    <div className="section-heading">
      <div><h2 id="transactions-title">Movimentações demonstrativas</h2>
        <p className="muted">Pesquisa, filtros, ordenação e paginação locais; nenhum dado real.</p></div>
      <Button variant="secondary" onClick={()=>setLoading(x=>!x)}>{loading?'Exibir dados':'Simular loading'}</Button>
    </div>
    <div className="transactions-filters">
      <Input label="Pesquisar" placeholder="Descrição, categoria ou conta" value={query}
        onChange={e=>{setQuery(e.target.value);resetPage()}}/>
      <Select label="Tipo" value={kind}
        options={[{value:'all',label:'Todos'},{value:'income',label:'Receitas'},{value:'expense',label:'Despesas'},{value:'transfer',label:'Transferências'}]}
        onChange={e=>{setKind(e.target.value as 'all'|TransactionType);resetPage()}}/>
      <Select label="Categoria" value={category} options={categories}
        onChange={e=>{setCategory(e.target.value);resetPage()}}/>
    </div>
    <div className="transactions-metrics" aria-label="Totais dos registros filtrados">
      <MetricCard label="Receitas filtradas" value={formatCentsBRL(totals.income)} supportingText="Entradas demonstrativas" tone="income"/>
      <MetricCard label="Despesas filtradas" value={formatCentsBRL(totals.expense)} supportingText="Consumo demonstrativo" tone="expense"/>
      <MetricCard label="Saldo das receitas e despesas" value={formatCentsBRL(totals.income-totals.expense)}
        supportingText="Exclui transferências próprias" tone="neutral"/>
    </div>
    <Card className="transactions-table-card">
      {loading?<div className="transactions-loading" role="status" aria-label="Carregando tabela de demonstração">
        {Array.from({length:5},(_,i)=><Skeleton key={i} height="35px"/>)}
      </div>:<>
        {rows.length? <DataTable ariaLabel="Tabela de transações fictícias" columns={columns}
          rows={paginateRows(rows,currentPage,PAGE_SIZE)} getRowKey={row=>row.id}
          sort={sort} onSortChange={setSort}/> :
          <EmptyState title="Nenhuma movimentação encontrada"
            description="Altere a busca ou redefina os filtros."
            action={<Button variant="secondary" onClick={()=>{setQuery('');setKind('all');setCategory('all');setPage(1)}}>Limpar filtros</Button>}/>}
        <Pagination page={currentPage} pageSize={PAGE_SIZE} totalItems={rows.length} onPageChange={setPage}/>
      </>}
    </Card>
  </section>;
}
