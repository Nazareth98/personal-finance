import type { Meta,StoryObj } from '@storybook/react-vite';
import { CashFlowChart } from '@personal-finance/ui';
const values=[{label:'Jun',incomeCents:400000n,expenseCents:240000n},{label:'Jul',incomeCents:470000n,expenseCents:300000n},{label:'Ago',incomeCents:430000n,expenseCents:270000n}];
const format=(v:bigint)=>`R$ ${(v/100n).toLocaleString('pt-BR')},${String(v%100n).padStart(2,'0')}`;
const meta={title:'Charts/CashFlowChart',component:CashFlowChart,tags:['autodocs'],args:{data:values,formatValue:format}} satisfies Meta<typeof CashFlowChart>;
export default meta;type Story=StoryObj<typeof meta>;
export const Default:Story={};
export const Empty:Story={args:{data:[]}};
