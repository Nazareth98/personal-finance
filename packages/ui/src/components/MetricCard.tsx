import type {ReactNode} from 'react';
import { ArrowDownCircle, ArrowLeftRight, ArrowUpCircle, ChartNoAxesColumnIncreasing } from 'lucide-react';
import {Card} from './Card';
import {Icon} from './Icon';
export type MetricCardProps={
 label:string;value:string;supportingText?:string;
 tone?:'neutral'|'income'|'expense'|'transfer';
 valueTone?:'positive'|'negative'|'neutral';
 icon?:ReactNode;
};
export function MetricCard({label,value,supportingText,tone='neutral',valueTone,icon}:MetricCardProps){
 const DefaultIcon=tone==='income'?ArrowUpCircle:tone==='expense'?ArrowDownCircle:tone==='transfer'?ArrowLeftRight:ChartNoAxesColumnIncreasing;
 return <Card className="ui-metric-card">
 <div className="ui-metric-card__top"><span>{label}</span><span className={`ui-metric-card__icon ui-metric-card__icon--${tone}`} aria-hidden="true">{icon??<Icon icon={DefaultIcon} size="sm"/>}</span></div>
 <strong className={['ui-metric-card__value',valueTone&&valueTone!=='neutral'?`ui-metric-card__value--${valueTone}`:''].filter(Boolean).join(' ')}>{value}</strong>
 {supportingText?<span className={`ui-metric-card__support ui-metric-card__support--${tone}`}>{supportingText}</span>:null}
 </Card>;
}
