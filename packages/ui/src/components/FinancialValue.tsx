import type { HTMLAttributes } from 'react';

export type FinancialValueTone = 'positive' | 'negative' | 'neutral';
export type FinancialValueProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
  value: string;
  tone: FinancialValueTone;
  showSign?: boolean;
};

/** Tone refers to a signed outcome, not to the nature of a transaction. */
export function FinancialValue({value,tone,showSign=false,className='',...props}:FinancialValueProps) {
  const sign=tone==='positive'?'+':tone==='negative'?'−':'';
  return <span {...props} className={['ui-financial-value',`ui-financial-value--${tone}`,className].filter(Boolean).join(' ')}>
    {showSign && sign ? <span aria-hidden="true">{sign} </span> : null}{value}
  </span>;
}
