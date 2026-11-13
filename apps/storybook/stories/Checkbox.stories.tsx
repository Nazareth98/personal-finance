import type { Meta, StoryObj } from '@storybook/react-vite';
import { Checkbox } from '@personal-finance/ui';
const meta={
  title:'Forms/Checkbox',component:Checkbox,tags:['autodocs'],
  args:{label:'Confirmo a revisão dos dados demonstrativos',hint:'Nenhuma informação real será salva.'}
} satisfies Meta<typeof Checkbox>;
export default meta;
type Story=StoryObj<typeof meta>;
export const Default:Story={};
export const Checked:Story={args:{defaultChecked:true}};
export const Disabled:Story={args:{disabled:true}};
export const Invalid:Story={args:{error:'Confirme esta etapa.',hint:undefined}};
