import type { Meta,StoryObj } from '@storybook/react-vite';
import { FinancialValue } from '@personal-finance/ui';
const meta={title:'Finance/FinancialValue',component:FinancialValue,tags:['autodocs'],
 args:{tone:'positive',value:'R$ 1.250,00',showSign:true},
 argTypes:{tone:{control:'select',options:['positive','negative','neutral']}}} satisfies Meta<typeof FinancialValue>;
export default meta;
type Story=StoryObj<typeof meta>;
export const Positive:Story={};
export const Negative:Story={args:{tone:'negative',value:'R$ 280,00'}};
export const Neutral:Story={args:{tone:'neutral',value:'R$ 0,00'}};
