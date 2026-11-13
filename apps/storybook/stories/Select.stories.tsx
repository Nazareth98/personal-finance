import type { Meta, StoryObj } from '@storybook/react-vite';
import { Select } from '@personal-finance/ui';
const meta = {
  title:'Forms/Select', component:Select, tags:['autodocs'],
  args:{label:'Categoria',placeholder:'Selecione uma categoria',defaultValue:'',
    options:[{value:'food',label:'Alimentação'},{value:'housing',label:'Moradia'},{value:'transport',label:'Transporte'}]},
} satisfies Meta<typeof Select>;
export default meta;
type Story=StoryObj<typeof meta>;
export const Default:Story={};
export const Invalid:Story={args:{error:'Selecione uma categoria válida.'}};
export const Disabled:Story={args:{disabled:true}};
