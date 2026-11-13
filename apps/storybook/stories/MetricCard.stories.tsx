import type {Meta,StoryObj} from '@storybook/react-vite';
import {MetricCard} from '@personal-finance/ui';
const meta={title:'Data/MetricCard',component:MetricCard,tags:['autodocs'],args:{label:'Receitas fictícias',value:'R$ 6.270,00',supportingText:'Exemplo, sem dados reais',tone:'income'}} satisfies Meta<typeof MetricCard>;
export default meta;type Story=StoryObj<typeof meta>;
export const Income:Story={};
export const Expense:Story={args:{label:'Despesas fictícias',value:'R$ 2.058,68',tone:'expense'}};
