import type {Meta,StoryObj} from '@storybook/react-vite';
import {Badge,Button,Card,FinancialValue,Input,MetricCard} from '@personal-finance/ui';

function ThemePair(){
  return <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(290px,1fr))',gap:20,width:'min(1050px,95vw)'}}>
    {(['light','dark'] as const).map(theme=><div key={theme} data-theme={theme} style={{
      background:'var(--color-bg-canvas)',color:'var(--color-text-primary)',padding:24,
      border:'1px solid var(--color-border-default)',borderRadius:16,colorScheme:theme
    }}>
      <h2 style={{margin:'0 0 18px'}}>{theme==='light'?'Light':'Dark'} · Corporate UI</h2>
      <div style={{display:'grid',gap:14}}>
        <MetricCard label="Saldo demonstrativo" value="R$ 1.230,00" supportingText="Resultado positivo" valueTone="positive" tone="income"/>
        <Card>
          <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap'}}>
            <Badge tone="expense">Despesa</Badge>
            <FinancialValue value="R$ 420,00" tone="negative" showSign/>
          </div>
          <div style={{marginTop:18}}><Input label="Descrição fictícia" placeholder="Ex.: Mercado"/></div>
          <div style={{display:'flex',gap:8,marginTop:18,flexWrap:'wrap'}}>
            <Button>Adicionar</Button><Button variant="secondary">Cancelar</Button>
          </div>
        </Card>
      </div>
    </div>)}
  </div>;
}
const meta={title:'Foundations/Light & Dark',component:ThemePair,tags:['autodocs'],parameters:{layout:'centered'}} satisfies Meta<typeof ThemePair>;
export default meta;type Story=StoryObj<typeof meta>;
export const SideBySide:Story={};
