import type {ReactNode} from 'react';
import { ArrowDownCircle, ArrowLeftRight, ArrowUpCircle, ChartNoAxesColumnIncreasing } from 'lucide-react';
import {Card} from './Card';
import {Icon} from './Icon';
import {InfoTip} from './InfoTip';
export type MetricCardProps={
 label:string;value:string;supportingText?:string;
 tone?:'neutral'|'income'|'expense'|'transfer';
 valueTone?:'positive'|'negative'|'neutral';
 /** Cor do texto de apoio independente do ícone, para comparações com sinal. */
 supportingTone?:'positive'|'negative'|'neutral';
 icon?:ReactNode;
 /** Explicação curta do rótulo, num botão “i” ao lado (D-067). */
 info?:string;
};
export function MetricCard({label,value,supportingText,tone='neutral',valueTone,supportingTone,icon,info}:MetricCardProps){
 const DefaultIcon=tone==='income'?ArrowUpCircle:tone==='expense'?ArrowDownCircle:tone==='transfer'?ArrowLeftRight:ChartNoAxesColumnIncreasing;
 return <Card className="ui-metric-card">
 <div className="ui-metric-card__top"><span className="ui-metric-card__label">{label}{info?<InfoTip label={label} text={info}/>:null}</span><span className={`ui-metric-card__icon ui-metric-card__icon--${tone}`} aria-hidden="true">{icon??<Icon icon={DefaultIcon} size="sm"/>}</span></div>
 <strong className={['ui-metric-card__value',valueTone&&valueTone!=='neutral'?`ui-metric-card__value--${valueTone}`:''].filter(Boolean).join(' ')}>{value}</strong>
 {supportingText?<span className={`ui-metric-card__support ui-metric-card__support--${supportingTone??tone}`}>{supportingText}</span>:null}
 </Card>;
}
