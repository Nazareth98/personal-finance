import type { Meta, StoryObj } from '@storybook/react-vite';
import { RadioGroup } from '@personal-finance/ui';
const meta={
  title:'Forms/RadioGroup',component:RadioGroup,tags:['autodocs'],
  args:{legend:'Tipo de movimentação',name:'kind',defaultValue:'expense',
    options:[{value:'income',label:'Receita'},{value:'expense',label:'Despesa'},{value:'transfer',label:'Transferência'}]}
} satisfies Meta<typeof RadioGroup>;
export default meta;
type Story=StoryObj<typeof meta>;
export const Default:Story={};
export const Disabled:Story={args:{disabled:true}};
export const Invalid:Story={args:{error:'Selecione o tipo de movimentação.'}};
