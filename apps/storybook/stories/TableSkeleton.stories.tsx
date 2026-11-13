import type { Meta,StoryObj } from '@storybook/react-vite';
import { TableSkeleton } from '@personal-finance/ui';
const meta={title:'Loading/TableSkeleton',component:TableSkeleton,tags:['autodocs'],args:{rows:5,columns:5}} satisfies Meta<typeof TableSkeleton>;
export default meta;type Story=StoryObj<typeof meta>;
export const Default:Story={};
export const Compact:Story={args:{rows:3,columns:3}};
