import type { Meta,StoryObj } from '@storybook/react-vite';
import { FormMessage } from '@personal-finance/ui';
const meta={title:'Forms/FormMessage',component:FormMessage,tags:['autodocs'],
  args:{children:'Este campo ajuda a identificar a operação.',tone:'hint'}} satisfies Meta<typeof FormMessage>;
export default meta;
type Story=StoryObj<typeof meta>;
export const Hint:Story={};
export const Error:Story={args:{tone:'error',children:'O valor é obrigatório.'}};
export const Success:Story={args:{tone:'success',children:'Valor validado.'}};
