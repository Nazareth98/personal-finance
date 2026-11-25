import { ChartAnnouncement, ChartTooltip, tooltipEdge, useChartFocus } from './ChartInteraction';
import { ChartDetails } from './ChartDetails';
import { EmptyState } from './EmptyState';

export type StackedSeries = { key: string; label: string; color: string };
export type StackedColumnPoint = {
  label: string; axisLabel?: string;
  /** Valor por série (chave da série → centavos, ≥ 0). */
  values: Readonly<Record<string, bigint>>;
  /** Marca de referência (receita do mês). */
  referenceCents?: bigint;
  projected?: boolean; current?: boolean;
};

export type StackedColumnChartProps = {
  title: string;
  series: readonly StackedSeries[];
  data: readonly StackedColumnPoint[];
  formatValue: (value: bigint) => string;
  referenceLabel?: string;
  /** Rótulo da soma das séries no tooltip. */
  totalLabel?: string;
  projectedLabel?: string;
  collapsibleDetails?: boolean;
};

const total = (point: StackedColumnPoint) => Object.values(point.values).reduce((sum, value) => sum + (value > 0n ? value : 0n), 0n);
const height = (value: bigint, scale: bigint) => scale > 0n ? Number(value * 10000n / scale) / 100 : 0;

/**
 * Colunas empilhadas por série (D-085) com marca de referência por período (a receita). Períodos previstos
 * ficam listrados. Setas percorrem os períodos; tabela equivalente com total, referência e cada série.
 */
export function StackedColumnChart({ title, series, data, formatValue, referenceLabel = 'Receita', totalLabel = 'Despesas', projectedLabel = 'Previsto', collapsibleDetails }: StackedColumnChartProps) {
  const current = data.findIndex(point => point.current);
  const focus = useChartFocus(data.length, current < 0 ? data.length - 1 : current);
  if (!data.length) return <EmptyState title="Sem valores para o gráfico" description="Adicione períodos para consultar a série." />;
  const scale = data.reduce((max, point) => {
    const candidate = total(point) > (point.referenceCents ?? 0n) ? total(point) : point.referenceCents ?? 0n;
    return candidate > max ? candidate : max;
  }, 0n);
  const active = focus.active === null ? undefined : data[focus.active];
  const balance = (point: StackedColumnPoint) => {
    const left = (point.referenceCents ?? 0n) - total(point);
    return left >= 0n ? `Sobra ${formatValue(left)}` : `Passa ${formatValue(-left)} da ${referenceLabel.toLowerCase()}`;
  };
  const describe = (point: StackedColumnPoint) => `${point.label}${point.projected ? ` · ${projectedLabel}` : ''}`;
  return <figure className="ui-chart ui-stacked" aria-label={title}>
    <div className="ui-chart__legend" aria-hidden="true">
      {series.map(item => <span key={item.key}><i className="ui-chart__swatch" style={{ background: item.color }} />{item.label}</span>)}
      <span><i className="ui-stacked__reference-swatch" />{referenceLabel}</span>
      {data.some(point => point.projected) ? <span><i className="ui-chart__swatch ui-chart__swatch--projected" />{projectedLabel}</span> : null}
    </div>
    <div className={`ui-chart__columns ui-stacked__columns${active ? ' has-active' : ''}`} role="group" aria-label={`${title}: use as setas para percorrer os períodos`} {...focus.plot}>
      {data.map((point, index) => <div key={index} aria-hidden="true" {...focus.point(index)}
        className={`ui-chart__column-group${point.current ? ' is-current' : ''}${index === focus.active ? ' is-active' : ''}`}>
        <div className="ui-chart__column-bars ui-stacked__bars">
          {index === focus.active ? <ChartTooltip title={describe(point)} className={tooltipEdge(index, data.length)}>
            {series.filter(item => (point.values[item.key] ?? 0n) > 0n).map(item => <span key={item.key} className="ui-chart-tooltip__row">
              <i className="ui-chart__swatch" style={{ background: item.color }} />{item.label} <strong>{formatValue(point.values[item.key]!)}</strong></span>)}
            <span className="ui-chart-tooltip__row ui-chart-tooltip__total">{totalLabel} <strong>{formatValue(total(point))}</strong></span>
            {point.referenceCents !== undefined ? <span className="ui-chart-tooltip__row"><i className="ui-stacked__reference-swatch" />{referenceLabel} <strong>{formatValue(point.referenceCents)}</strong></span> : null}
            {point.referenceCents !== undefined ? <span>{balance(point)}</span> : null}
          </ChartTooltip> : null}
          <span className={`ui-stacked__stack${point.projected ? ' is-projected' : ''}`} style={{ height: `${height(total(point), scale)}%` }}>
            {series.map(item => point.values[item.key] && point.values[item.key]! > 0n
              ? <span key={item.key} style={{ flexGrow: Number(point.values[item.key]! / 100n) || 1, background: item.color }} /> : null)}
          </span>
          {point.referenceCents !== undefined && point.referenceCents > 0n
            ? <span className="ui-stacked__reference" style={{ bottom: `${height(point.referenceCents, scale)}%` }} /> : null}
        </div>
        <span className="ui-chart__column-label">{point.axisLabel ?? point.label}</span>
      </div>)}
    </div>
    <ChartAnnouncement text={active ? `${describe(active)}, ${totalLabel.toLowerCase()} ${formatValue(total(active))}${active.referenceCents !== undefined ? `, ${referenceLabel.toLowerCase()} ${formatValue(active.referenceCents)}, ${balance(active).toLowerCase()}` : ''}` : ''} />
    <ChartDetails collapsible={collapsibleDetails}>
      <table className="ui-chart-table" aria-label={`Valores: ${title}`}>
        <thead><tr><th scope="col">Período</th><th scope="col">Total</th><th scope="col">{referenceLabel}</th>{series.map(item => <th key={item.key} scope="col">{item.label}</th>)}</tr></thead>
        <tbody>{data.map((point, index) => <tr key={index} {...focus.row(index)}><th scope="row">{describe(point)}</th>
          <td>{formatValue(total(point))}</td><td>{point.referenceCents !== undefined ? formatValue(point.referenceCents) : '—'}</td>
          {series.map(item => <td key={item.key}>{formatValue(point.values[item.key] ?? 0n)}</td>)}</tr>)}</tbody>
      </table>
    </ChartDetails>
  </figure>;
}
