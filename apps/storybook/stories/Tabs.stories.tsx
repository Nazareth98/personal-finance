import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tabs } from '@personal-finance/ui';
const items=[
  {id:'2026-11',label:<><strong>nov/2026</strong><span>Em aberto · R$ 120,00</span></>},
  {id:'2026-12',label:<><strong>dez/2026</strong><span>Prevista · R$ 120,00</span></>}
];
function Demo(){
  const [selected,setSelected]=useState('2026-11');
  return <Tabs label="Faturas do cartão fictício" items={items} selectedId={selected} onSelect={setSelected}>
    <p>Conteúdo demonstrativo da fatura {selected}.</p>
  </Tabs>;
}
const meta={title:'Navigation/Tabs',component:Demo,tags:['autodocs']} satisfies Meta<typeof Demo>;
export default meta;
type Story=StoryObj<typeof meta>;
export const Default:Story={};
