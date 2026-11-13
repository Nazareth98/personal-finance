import type {Meta,StoryObj} from '@storybook/react-vite';
import {Skeleton} from '@personal-finance/ui';
const meta={title:'Data/Skeleton',component:Skeleton,tags:['autodocs'],args:{width:'300px',height:'20px'}} satisfies Meta<typeof Skeleton>;
export default meta;type Story=StoryObj<typeof meta>;
export const Default:Story={};
export const TableLoading:Story={render:()=> <div style={{display:'grid',gap:12,width:500}}>{Array.from({length:5},(_,i)=><Skeleton key={i} height="35px"/>)}</div>};
