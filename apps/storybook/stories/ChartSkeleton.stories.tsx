import type { Meta,StoryObj } from '@storybook/react-vite';
import { ChartSkeleton } from '@personal-finance/ui';
const meta={title:'Loading/ChartSkeleton',component:ChartSkeleton,tags:['autodocs'],args:{kind:'bars',height:220}} satisfies Meta<typeof ChartSkeleton>;
export default meta;type Story=StoryObj<typeof meta>;
export const Bars:Story={};
export const Line:Story={args:{kind:'line'}};
export const Donut:Story={args:{kind:'donut'}};
