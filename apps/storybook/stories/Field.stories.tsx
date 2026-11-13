import type { Meta,StoryObj } from '@storybook/react-vite';
import { Field } from '@personal-finance/ui';
const meta={title:'Forms/Field',component:Field,tags:['autodocs'],
  args:{label:'Identificador',htmlFor:'sample-id',hint:'Exemplo de campo de baixo nível.',
    children:<input id="sample-id" className="ui-input" placeholder="Digite um identificador"/>}} satisfies Meta<typeof Field>;
export default meta;
type Story=StoryObj<typeof meta>;
export const Default:Story={};
