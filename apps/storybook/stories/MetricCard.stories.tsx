import type { Meta,StoryObj } from '@storybook/react-vite';
import { MetricCard } from '@personal-finance/ui';
const meta={title:'Data/MetricCard',component:MetricCard,tags:['autodocs'],
  args:{label:'Receitas de demonstração',value:'R$ 6.270,00',supportingText:'Valores fictícios',tone:'income'}
} satisfies Meta<typeof MetricCard>;
export default meta;
type Story=StoryObj<typeof meta>;
export const Income:Story={};
export const Expense:Story={args:{label:'Despesas de demonstração',value:'R$ 2.058,68',
  supportingText:'Consumo fictício',tone:'expense'}};
export const Neutral:Story={args:{label:'Saldo demonstrativo',value:'R$ 4.211,32',
  supportingText:'Sem transferências próprias',tone:'neutral'}};
