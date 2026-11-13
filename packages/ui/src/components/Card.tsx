import type { HTMLAttributes } from 'react';

export type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className = '', ...props }: CardProps) {
  return <section {...props} className={['ui-card', className].filter(Boolean).join(' ')} />;
}
