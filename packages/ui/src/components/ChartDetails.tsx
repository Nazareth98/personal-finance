import { useId, useState, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { Icon } from './Icon';

/**
 * Tabela de valores do gráfico (D-058). Recolhida, continua no DOM só para leitor de tela; o botão alterna
 * “Ver valores” e “Ocultar valores”. `summary` fica ao lado do botão mesmo recolhido.
 */
export function ChartDetails({ collapsible, summary, children }: { collapsible?: boolean; summary?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  if (!collapsible) return <div className="ui-chart__values" role="group" aria-label="Tabela de valores" tabIndex={0}>{children}</div>;
  return <div className="ui-chart__more">
    <div className="ui-chart__more-bar">
      <button type="button" className="ui-chart__more-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>
        <Icon icon={ChevronRight} size="sm" className="ui-chart__more-chevron" />{open ? 'Ocultar valores' : 'Ver valores'}
      </button>
      {summary ? <span className="ui-chart__more-summary">{summary}</span> : null}
    </div>
    <div id={id} className={open ? 'ui-chart__values' : 'ui-sr-only'} role="group" aria-label="Tabela de valores" tabIndex={open ? 0 : -1}>{children}</div>
  </div>;
}
