import type {Meta,StoryObj} from '@storybook/react-vite';
import {CashFlowChart,TrendLineChart,CategoryDonutChart} from '@personal-finance/ui';
const money=(v:bigint)=>`${v<0n?'-':''}R$ ${((v<0n?-v:v)/100n).toLocaleString('pt-BR')},${String((v<0n?-v:v)%100n).padStart(2,'0')}`;
function Gallery(){
  return <div style={{display:'grid',gap:30,maxWidth:660}}>
    <section><h3>Fluxo com valores zerados</h3><CashFlowChart data={[{label:'Jan',incomeCents:0n,expenseCents:0n}]} formatValue={money}/></section>
    <section><h3>Série com déficits e saldo zero</h3><TrendLineChart data={[{label:'Jan',valueCents:-15000n},{label:'Fev',valueCents:0n},{label:'Mar',valueCents:20000n}]} formatValue={money}/></section>
    <section><h3>Rosca: descarta fatias inválidas</h3><CategoryDonutChart data={[{label:'Moradia',valueCents:7500n},{label:'Zero',valueCents:0n},{label:'Inválido',valueCents:-100n}]} formatValue={money}/></section>
    <section><h3>Rosca vazia</h3><CategoryDonutChart data={[{label:'Zero',valueCents:0n}]} formatValue={money}/></section>
  </div>;
}
const meta={title:'Charts/Edge cases',component:Gallery,tags:['autodocs']} satisfies Meta<typeof Gallery>;
export default meta;type Story=StoryObj<typeof meta>;
export const Overview:Story={};
