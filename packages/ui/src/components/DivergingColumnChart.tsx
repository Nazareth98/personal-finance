import type { CSSProperties } from 'react';
import { percentage } from '../lib/chart-data';
import { ChartDetails } from './ChartDetails';
import { EmptyState } from './EmptyState';

export type DivergingPoint = { label: string; axisLabel?: string; valueCents: bigint };
export type DivergingColumnChartProps = {
  data: readonly DivergingPoint[];
  formatValue: (value: bigint) => string;
  title: string;
  positiveLabel?: string;
  negativeLabel?: string;
  collapsibleDetails?: boolean;
};

/**
 * Colunas acima e abaixo de zero na mesma escala. O negativo também é hachurado e fica abaixo
 * da linha, para não depender só da cor; a tabela oculta e “Ver valores” dão a alternativa textual.
 */
export function DivergingColumnChart({ data, formatValue, title, positiveLabel = 'Positivo', negativeLabel = 'Negativo', collapsibleDetails }: DivergingColumnChartProps) {
  if (!data.length) return <EmptyState title="Sem valores para o gráfico" description="Adicione períodos para consultar a série." />;
  const abs = (value: bigint) => value < 0n ? -value : value;
  const maxPositive = data.reduce((max, point) => point.valueCents > max ? point.valueCents : max, 0n);
  const maxNegative = data.reduce((max, point) => point.valueCents < 0n && -point.valueCents > max ? -point.valueCents : max, 0n);
  const scale = maxPositive > maxNegative ? maxPositive : maxNegative;
  // Cada lado ocupa altura proporcional ao seu maior valor (160 px no total), com um mínimo quando existe.
  const CHART_HEIGHT = 160;
  const total = maxPositive + maxNegative;
  const upShare = total > 0n ? percentage(maxPositive, total) : 100;
  const upHeight = maxNegative > 0n ? Math.round(CHART_HEIGHT * Math.min(85, Math.max(15, upShare)) / 100) : CHART_HEIGHT;
  const downHeight = maxNegative > 0n ? CHART_HEIGHT - upHeight : 0;
  const tone = (value: bigint) => value < 0n ? 'negative' : value > 0n ? 'positive' : 'neutral';
  const status = (value: bigint) => value < 0n ? negativeLabel : positiveLabel;
  return <figure className="ui-chart" aria-label={title}>
    <div className="ui-chart__legend" aria-hidden="true">
      <span><i className="ui-chart__swatch ui-chart__swatch--positive" /> {positiveLabel}</span>
      {maxNegative > 0n ? <span><i className="ui-chart__swatch ui-chart__swatch--negative" /> {negativeLabel}</span> : null}
    </div>
    <div className="ui-diverging" aria-hidden="true" style={{ '--ui-diverging-up': `${upHeight}px`, '--ui-diverging-down': `${downHeight}px` } as CSSProperties}>
      {data.map((point, index) => {
        const height = `${percentage(abs(point.valueCents), scale === 0n ? 1n : (point.valueCents < 0n ? maxNegative : maxPositive))}%`;
        return <div key={index} className="ui-diverging__group">
          <div className="ui-diverging__up">{point.valueCents > 0n ? <span className="ui-diverging__bar ui-diverging__bar--positive" style={{ height }} /> : null}</div>
          <div className="ui-diverging__down">{point.valueCents < 0n ? <span className="ui-diverging__bar ui-diverging__bar--negative" style={{ height }} /> : null}</div>
          <span className="ui-chart__column-label">{point.axisLabel ?? point.label}</span>
        </div>;
      })}
    </div>
    <figcaption className="ui-sr-only">{title}. Valores por período na tabela.</figcaption>
    <table className="ui-sr-only"><thead><tr><th scope="col">Período</th><th scope="col">Valor</th><th scope="col">Situação</th></tr></thead>
      <tbody>{data.map((point, index) => <tr key={index}><th scope="row">{point.label}</th><td>{formatValue(point.valueCents)}</td><td>{status(point.valueCents)}</td></tr>)}</tbody></table>
    <ChartDetails collapsible={collapsibleDetails}><div className="ui-chart__details">{data.map((point, index) => <div key={index}>
      <strong>{point.label}</strong><span className={`ui-chart__${tone(point.valueCents)}`}>{formatValue(point.valueCents)}</span>
    </div>)}</div></ChartDetails>
  </figure>;
}
