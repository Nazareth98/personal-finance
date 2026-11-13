import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Dialog, Input } from '@personal-finance/ui';
function DialogDemo(){
  const [open,setOpen]=useState(false);
  return <><Button onClick={()=>setOpen(true)}>Abrir formulário</Button>
    <Dialog open={open} onClose={()=>setOpen(false)} title="Editar lançamento demonstrativo"
      description="A janela pode ser fechada com Escape ou pelo botão Fechar.">
      <Input label="Descrição" placeholder="Ex.: compra fictícia"/>
      <div style={{marginTop:16}}><Button variant="secondary" onClick={()=>setOpen(false)}>Cancelar</Button></div>
    </Dialog>
  </>;
}
const meta={title:'Forms/Dialog',component:Dialog,tags:['autodocs']} satisfies Meta<typeof Dialog>;
export default meta;
type Story=StoryObj<typeof meta>;
export const Interactive:Story={args:{open:false,onClose:()=>{},title:'Exemplo',children:'Conteúdo'},render:()=> <DialogDemo/>};
