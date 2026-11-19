import type { CSSProperties } from 'react';
import { changeLabel, percentage } from '../lib/chart-data';
import { ChartDetails } from './ChartDetails';
import { ChartAnnouncement, ChartTooltip, tooltipEdge, useChartFocus } from './ChartInteraction';
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
 * da linha, para não depender só da cor; a tabela de valores dá a alternativa textual.
 */
export function DivergingColumnChart({ data, formatValue, title, positiveLabel = 'Positivo', negativeLabel = 'Negativo', collapsibleDetails }: DivergingColumnChartProps) {
  const focus = useChartFocus(data.length, 0);
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
  const change = (index: number) => changeLabel(data[index]!.valueCents, data[index - 1]?.valueCents);
  const active = focus.active === null ? undefined : data[focus.active];
  return <figure className="ui-chart" aria-label={title}>
    <div className="ui-chart__legend" aria-hidden="true">
      <span><i className="ui-chart__swatch ui-chart__swatch--positive" /> {positiveLabel}</span>
      {maxNegative > 0n ? <span><i className="ui-chart__swatch ui-chart__swatch--negative" /> {negativeLabel}</span> : null}
    </div>
    <div className={`ui-diverging${active ? ' has-active' : ''}`} role="group" aria-label={`${title}: use as setas para percorrer os períodos`} {...focus.plot}
      style={{ '--ui-diverging-up': `${upHeight}px`, '--ui-diverging-down': `${downHeight}px` } as CSSProperties}>
      {data.map((point, index) => {
        const height = `${percentage(abs(point.valueCents), scale === 0n ? 1n : (point.valueCents < 0n ? maxNegative : maxPositive))}%`;
        return <div key={index} aria-hidden="true" {...focus.point(index)} className={`ui-diverging__group${index === focus.active ? ' is-active' : ''}`}>
          {index === focus.active ? <ChartTooltip title={`${point.label} · ${status(point.valueCents)}`} className={tooltipEdge(index, data.length)}>
            <strong>{formatValue(point.valueCents)}</strong>{index > 0 ? <span>{change(index)} vs. {data[index - 1]!.axisLabel ?? data[index - 1]!.label}</span> : null}
          </ChartTooltip> : null}
          <div className="ui-diverging__up">{point.valueCents > 0n ? <span className="ui-diverging__bar ui-diverging__bar--positive" style={{ height }} /> : null}</div>
          <div className="ui-diverging__down">{point.valueCents < 0n ? <span className="ui-diverging__bar ui-diverging__bar--negative" style={{ height }} /> : null}</div>
          <span className="ui-chart__column-label">{point.axisLabel ?? point.label}</span>
        </div>;
      })}
    </div>
    <ChartAnnouncement text={active ? `${active.label}, ${status(active.valueCents)}, ${formatValue(active.valueCents)}` : ''} />
    <ChartDetails collapsible={collapsibleDetails}>
      <table className="ui-chart-table" aria-label={`Valores: ${title}`}>
        <thead><tr><th scope="col">Período</th><th scope="col">Situação</th><th scope="col">Valor</th><th scope="col">vs. anterior</th></tr></thead>
        <tbody>{data.map((point, index) => <tr key={index} {...focus.row(index)}>
          <th scope="row">{point.label}</th><td>{status(point.valueCents)}</td>
          <td className={`ui-chart__${tone(point.valueCents)}`}>{formatValue(point.valueCents)}</td><td>{change(index)}</td>
        </tr>)}</tbody>
      </table>
    </ChartDetails>
  </figure>;
}
