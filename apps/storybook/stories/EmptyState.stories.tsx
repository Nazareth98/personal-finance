import type { Meta,StoryObj } from '@storybook/react-vite';
import { EmptyState,Button } from '@personal-finance/ui';
const meta={title:'Data/EmptyState',component:EmptyState,tags:['autodocs'],
  args:{title:'Nenhuma movimentação encontrada',description:'Ajuste os filtros e tente novamente.',icon:'⌕'}
} satisfies Meta<typeof EmptyState>;
export default meta;
type Story=StoryObj<typeof meta>;
export const Default:Story={};
export const WithAction:Story={args:{action:<Button variant="secondary">Limpar filtros</Button>}};
