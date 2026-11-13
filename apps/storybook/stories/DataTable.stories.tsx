import type { Meta,StoryObj } from '@storybook/react-vite';
import { DataTable,Badge, type DataTableColumn } from '@personal-finance/ui';
import { useMemo,useState } from 'react';
type Item={id:string,date:string,description:string,amount:bigint};
const items:Item[]=[{id:'1',date:'11/11/2026',description:'Receita fictícia',amount:90000n},
{id:'2',date:'10/11/2026',description:'Compra fictícia',amount:-2135n}];
const columns:DataTableColumn<Item>[]=[
  {key:'date',header:'Data',cell:x=>x.date},
  {key:'description',header:'Descrição',cell:x=>x.description},
  {key:'amount',header:'Valor',align:'end',sortable:true,sortValue:x=>x.amount,
    cell:x=><Badge tone={x.amount<0n?'expense':'income'}>{x.amount<0n?'−':'+'}{String((x.amount<0n?-x.amount:x.amount)/100n)} reais (demo)</Badge>}
];
function Example(){
  const [sort,setSort]=useState<{key:string;direction:'asc'|'desc'}|null>(null);
  const sorted=useMemo(()=>{
    if(!sort)return items;
    return [...items].sort((a,b)=>sort.direction==='asc'?
      a.amount===b.amount?0:a.amount>b.amount?1:-1:
      a.amount===b.amount?0:a.amount>b.amount?-1:1);
  },[sort]);
  return <div style={{width:640}}><DataTable ariaLabel="Exemplo de dados sintéticos"
    columns={columns} rows={sorted} getRowKey={row=>row.id} sort={sort} onSortChange={setSort}/></div>;
}
const meta={title:'Data/DataTable',component:DataTable,tags:['autodocs'],
  args:{ariaLabel:'Exemplo de tabela',columns,rows:items,getRowKey:(row:Item)=>row.id}} satisfies Meta<typeof DataTable<Item>>;
export default meta;
type Story=StoryObj<typeof meta>;
export const Default:Story={render:()=> <Example/>};
export const Empty:Story={args:{rows:[],emptyTitle:'Sem transações',emptyDescription:'Não existem registros para exibir.'}};
