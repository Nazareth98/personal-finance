import type {ReactNode} from 'react';
import {Card} from './Card';
export type MetricCardProps={label:string;value:string;supportingText?:string;tone?:'neutral'|'income'|'expense'|'transfer';icon?:ReactNode};
export function MetricCard({label,value,supportingText,tone='neutral',icon}:MetricCardProps){
return <Card className="ui-metric-card"><div className="ui-metric-card__top"><span>{label}</span>{icon?<span aria-hidden="true">{icon}</span>:null}</div>
<strong className="ui-metric-card__value">{value}</strong>{supportingText?<span className={`ui-metric-card__support ui-metric-card__support--${tone}`}>{supportingText}</span>:null}</Card>;
}
