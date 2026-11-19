import { useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';

/**
 * Período em foco nos gráficos de série (D-058): mouse, toque e teclado (setas, Home, End) apontam o mesmo índice,
 * que destaca a coluna, abre o tooltip e realça a linha da tabela de valores.
 */
export function useChartFocus(length: number, initial = length - 1) {
  const [active, setActive] = useState<number | null>(null);
  const clamp = (index: number) => Math.max(0, Math.min(length - 1, index));
  return {
    active,
    plot: {
      tabIndex: 0,
      onMouseLeave: () => setActive(null),
      onFocus: () => setActive(current => current ?? clamp(initial)),
      onBlur: () => setActive(null),
      onKeyDown: (event: KeyboardEvent) => {
        const next = ({ ArrowRight: (active ?? initial - 1) + 1, ArrowLeft: (active ?? initial + 1) - 1, Home: 0, End: length - 1 } as Record<string, number>)[event.key];
        if (next === undefined) return;
        event.preventDefault();
        setActive(clamp(next));
      }
    },
    point: (index: number) => ({ onMouseEnter: () => setActive(index), onClick: () => setActive(index) }),
    row: (index: number) => ({ onMouseEnter: () => setActive(index), onMouseLeave: () => setActive(null), className: index === active ? 'is-active' : undefined })
  };
}

/** Classe de posição para o tooltip não sair do card nas pontas. */
export function tooltipEdge(index: number, length: number): string {
  return index === 0 && length > 1 ? ' ui-chart-tooltip--start' : index === length - 1 && length > 1 ? ' ui-chart-tooltip--end' : '';
}

/** Tooltip visual; o leitor de tela recebe o mesmo texto pela região viva `ChartAnnouncement`. */
export function ChartTooltip({ title, children, className = '', style }: { title: string; children: ReactNode; className?: string; style?: CSSProperties }) {
  return <span className={`ui-chart-tooltip${className}`} style={style} aria-hidden="true"><span className="ui-chart-tooltip__title">{title}</span>{children}</span>;
}

export function ChartAnnouncement({ text }: { text: string }) {
  return <p className="ui-sr-only" aria-live="polite">{text}</p>;
}
