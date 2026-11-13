import type { Meta,StoryObj } from '@storybook/react-vite';
import { CategoryDonutChart } from '@personal-finance/ui';
const data=[{label:'Moradia',valueCents:90000n},{label:'Alimentação',valueCents:33000n},{label:'Saúde',valueCents:12000n},{label:'Transporte',valueCents:10000n}];
const format=(v:bigint)=>`R$ ${(v/100n).toLocaleString('pt-BR')},${String(v%100n).padStart(2,'0')}`;
const meta={title:'Charts/CategoryDonutChart',component:CategoryDonutChart,tags:['autodocs'],args:{data,formatValue:format}} satisfies Meta<typeof CategoryDonutChart>;
export default meta;type Story=StoryObj<typeof meta>;
export const Default:Story={};
export const Empty:Story={args:{data:[]}};
