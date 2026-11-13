import type { Meta,StoryObj } from '@storybook/react-vite';
import { TrendLineChart } from '@personal-finance/ui';
const data=[{label:'Jun',valueCents:-10000n},{label:'Jul',valueCents:12000n},{label:'Ago',valueCents:33000n},{label:'Set',valueCents:27000n},{label:'Out',valueCents:43000n}];
const format=(v:bigint)=>`${v<0n?'-':''}R$ ${((v<0n?-v:v)/100n).toLocaleString('pt-BR')},${String((v<0n?-v:v)%100n).padStart(2,'0')}`;
const meta={title:'Charts/TrendLineChart',component:TrendLineChart,tags:['autodocs'],args:{data,formatValue:format}} satisfies Meta<typeof TrendLineChart>;
export default meta;type Story=StoryObj<typeof meta>;
export const Default:Story={};
export const Empty:Story={args:{data:[]}};
