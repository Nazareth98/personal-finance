import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button,ToastProvider,useToast } from '@personal-finance/ui';
function ToastDemo(){
  const {notify}=useToast();
  return <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
    <Button onClick={()=>notify({message:'Operação demonstrativa concluída.',tone:'success'})}>Sucesso</Button>
    <Button variant="secondary" onClick={()=>notify({message:'Revise os campos informados.',tone:'error'})}>Erro</Button>
    <Button variant="ghost" onClick={()=>notify({message:'Importação de exemplo em revisão.',tone:'info'})}>Informação</Button>
  </div>;
}
const meta={
  title:'Forms/Toast',component:ToastProvider,tags:['autodocs'],
} satisfies Meta<typeof ToastProvider>;
export default meta;
type Story=StoryObj<typeof meta>;
export const Interactive:Story={args:{children:null},render:()=> <ToastProvider><ToastDemo/></ToastProvider>};
