import {useState} from 'react';
import type {Meta,StoryObj} from '@storybook/react-vite';
import {Pagination} from '@personal-finance/ui';
function Example(){const [page,setPage]=useState(1);return <Pagination page={page} pageSize={5} totalItems={12} onPageChange={setPage}/>;}
const meta={title:'Data/Pagination',component:Example,tags:['autodocs']} satisfies Meta<typeof Example>;
export default meta;type Story=StoryObj<typeof meta>;
export const Interactive:Story={};
