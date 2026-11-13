import type {Meta,StoryObj} from '@storybook/react-vite';
import {DataState,CashFlowChart,CategoryDonutChart,TrendLineChart} from '@personal-finance/ui';
const format=(v:bigint)=>`R$ ${(v/100n).toLocaleString('pt-BR')},${String(v%100n).padStart(2,'0')}`;
function Example({status='success',kind='chart'}:{status:'success'|'loading'|'error';kind:'chart'|'table'}){
  return <div style={{maxWidth:620,width:'100%',border:'1px solid var(--color-border-default)',padding:16}}>
    <DataState status={status} kind={kind} label="Carregando gráfico" errorDescription="Falha ilustrativa para revisão visual." onRetry={()=>{}}>
      <CashFlowChart data={[{label:'Out',incomeCents:100000n,expenseCents:33000n},{label:'Nov',incomeCents:120000n,expenseCents:87000n}]} formatValue={format}/>
    </DataState>
  </div>;
}
const meta={title:'States/Async content',component:Example,tags:['autodocs'],
  args:{status:'loading',kind:'chart'}} satisfies Meta<typeof Example>;
export default meta;type Story=StoryObj<typeof meta>;
export const LoadingChart:Story={};
export const ErrorChart:Story={args:{status:'error'}};
export const ReadyChart:Story={args:{status:'success'}};
export const LoadingTable:Story={args:{status:'loading',kind:'table'}};
export const ErrorTable:Story={args:{status:'error',kind:'table'}};
