import type { ReactNode } from 'react';

/** Valores textuais do gráfico; recolhidos em “Ver valores” quando `collapsible`, sempre acessíveis por teclado. */
export function ChartDetails({ collapsible, children }: { collapsible?: boolean; children: ReactNode }) {
  return collapsible ? <details className="ui-chart__more"><summary>Ver valores</summary>{children}</details> : <>{children}</>;
}
