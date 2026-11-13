import type {ReactNode} from 'react';
import {Card} from './Card';
export type MetricCardProps={
 label:string;value:string;supportingText?:string;
 tone?:'neutral'|'income'|'expense'|'transfer';
 valueTone?:'positive'|'negative'|'neutral';
 icon?:ReactNode;
};
export function MetricCard({label,value,supportingText,tone='neutral',valueTone,icon}:MetricCardProps){
 return <Card className="ui-metric-card">
 <div className="ui-metric-card__top"><span>{label}</span>{icon?<span aria-hidden="true">{icon}</span>:null}</div>
 <strong className={['ui-metric-card__value',valueTone&&valueTone!=='neutral'?`ui-metric-card__value--${valueTone}`:''].filter(Boolean).join(' ')}>{value}</strong>
 {supportingText?<span className={`ui-metric-card__support ui-metric-card__support--${tone}`}>{supportingText}</span>:null}
 </Card>;
}
