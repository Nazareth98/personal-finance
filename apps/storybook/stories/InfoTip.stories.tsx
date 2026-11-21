import type {Meta,StoryObj} from '@storybook/react-vite';
import {InfoTip,MetricCard} from '@personal-finance/ui';
function Example(){return <div style={{display:'grid',gap:24,maxWidth:360}}>
  <span style={{display:'inline-flex',alignItems:'center',gap:4}}>Total em tetos<InfoTip label="Total em tetos" text="Soma dos tetos mensais das categorias com meta."/></span>
  <MetricCard label="Resultado do período" value="+ R$ 1.234,56" info="Receitas menos despesas do mês. Transferências e pagamentos de fatura ficam de fora."/>
</div>;}
const meta={title:'Feedback/InfoTip',component:Example,tags:['autodocs']} satisfies Meta<typeof Example>;
export default meta;type Story=StoryObj<typeof meta>;
export const Interactive:Story={};
