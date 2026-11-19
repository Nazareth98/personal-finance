import { useId } from 'react';

export type BrandMarkProps = {
  /** Lado em px. A marca herda a cor do texto (`currentColor`). */
  size?: number;
  /** Metades alternam como pratos de balança (carregamento). Para com `prefers-reduced-motion`. */
  animated?: boolean;
  className?: string;
};

/**
 * Marca “Balanço arredondado” (D-045): círculo r 23 em grade de 64, cortado por um vão de 4;
 * a metade do que entrou sobe 3, a do que saiu desce 3 em tinta de 45%. Decorativa: o nome do
 * produto vem sempre em texto ao lado ou num rótulo acessível de quem a usa.
 */
export function BrandMark({ size = 24, animated = false, className = '' }: BrandMarkProps) {
  const clip = `pf-brand-${useId().replace(/:/g, '')}`;
  return <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false"
    className={['ui-brand-mark', animated ? 'ui-brand-mark--animated' : '', className].filter(Boolean).join(' ')}>
    <defs><clipPath id={clip}><circle cx="32" cy="32" r="23" /></clipPath></defs>
    <g className="ui-brand-mark__in" transform="translate(0 -3)"><rect x="9" y="9" width="21" height="46" rx="6" fill="currentColor" clipPath={`url(#${clip})`} /></g>
    <g className="ui-brand-mark__out" transform="translate(0 3)"><rect x="34" y="9" width="21" height="46" rx="6" fill="currentColor" fillOpacity="0.45" clipPath={`url(#${clip})`} /></g>
  </svg>;
}
