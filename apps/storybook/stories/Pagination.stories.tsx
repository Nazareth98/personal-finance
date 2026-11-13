import { useState } from 'react';
import type { Meta,StoryObj } from '@storybook/react-vite';
import { Pagination } from '@personal-finance/ui';
function Example(){const [page,setPage]=useState(1);
return <Pagination page={page} pageSize={5} totalItems={12} onPageChange={setPage}/>;}
const meta={title:'Data/Pagination',component:Pagination,tags:['autodocs'],
  args:{page:1,pageSize:5,totalItems:12,onPageChange:()=>{}}
} satisfies Meta<typeof Pagination>;
export default meta;
type Story=StoryObj<typeof meta>;
export const Interactive:Story={render:()=> <Example/>};
export const Empty:Story={args:{totalItems:0}};
