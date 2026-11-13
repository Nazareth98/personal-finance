import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DataTable, Badge, sortRows, type SortState, type DataTableColumn } from '@personal-finance/ui';

type Row={id:string;description:string;kind:'income'|'expense';amount:bigint};
const data:Row[]=[{id:'1',description:'Receita de exemplo',kind:'income',amount:120000n},{id:'2',description:'Compra ilustrativa',kind:'expense',amount:4990n}];
const columns:DataTableColumn<Row>[]=[
 {key:'description',header:'Descrição',cell:r=>r.description,sortable:true,sortValue:r=>r.description},
 {key:'kind',header:'Natureza',cell:r=><Badge tone={r.kind}>{r.kind==='income'?'Receita':'Despesa'}</Badge>},
 {key:'amount',header:'Valor em centavos',align:'end',cell:r=>String(r.amount),sortable:true,sortValue:r=>r.amount}
];
function Example(){
 const [sort,setSort]=useState<SortState>({key:'description',direction:'asc'});
 return <div style={{width:'min(750px,95vw)'}}><DataTable ariaLabel="Transações fictícias" rows={sortRows(data,sort,columns)}
 columns={columns} getRowKey={row=>row.id} sort={sort} onSortChange={setSort}/></div>;
}
const meta={title:'Data/DataTable',component:Example,tags:['autodocs']} satisfies Meta<typeof Example>;
export default meta;type Story=StoryObj<typeof meta>;
export const Default:Story={};
