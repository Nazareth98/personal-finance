import { changeLabel, percentage } from '../lib/chart-data';
import { ChartDetails } from './ChartDetails';
import { ChartAnnouncement, ChartTooltip, tooltipEdge, useChartFocus } from './ChartInteraction';
import { EmptyState } from './EmptyState';

/** `axisLabel` é o rótulo curto do eixo; `label` completo segue na tabela e nos valores. */
export type ColumnPoint = { label: string; axisLabel?: string; valueCents: bigint; projected?: boolean; current?: boolean };
export type ColumnChartProps = {
  data: readonly ColumnPoint[];
  formatValue: (value: bigint) => string;
  title: string;
  valueLabel?: string;
  projectedLabel?: string;
  collapsibleDetails?: boolean;
};

/** Uma série de magnitudes por período; valores previstos usam textura, não só cor. */
export function ColumnChart({ data, formatValue, title, valueLabel = 'Valor', projectedLabel = 'Previsto', collapsibleDetails }: ColumnChartProps) {
  const current = data.findIndex(point => point.current);
  const focus = useChartFocus(data.length, current < 0 ? data.length - 1 : current);
  if (!data.length) return <EmptyState title="Sem valores para o gráfico" description="Adicione períodos para consultar a série." />;
  const scale = data.reduce((max, point) => point.valueCents > max ? point.valueCents : max, 0n);
  const status = (point: ColumnPoint) => point.projected ? projectedLabel : valueLabel;
  const change = (index: number) => changeLabel(data[index]!.valueCents, data[index - 1]?.valueCents);
  const active = focus.active === null ? undefined : data[focus.active];
  return <figure className="ui-chart" aria-label={title}>
    <div className="ui-chart__legend" aria-hidden="true">
      <span><i className="ui-chart__swatch ui-chart__swatch--neutral" /> {valueLabel}</span>
      {data.some(point => point.projected) ? <span><i className="ui-chart__swatch ui-chart__swatch--projected" /> {projectedLabel}</span> : null}
    </div>
    <div className={`ui-chart__columns${active ? ' has-active' : ''}`} role="group" aria-label={`${title}: use as setas para percorrer os períodos`} {...focus.plot}>
      {data.map((point, index) => <div key={index} aria-hidden="true" {...focus.point(index)}
        className={`ui-chart__column-group${point.current ? ' is-current' : ''}${index === focus.active ? ' is-active' : ''}`}>
        <div className="ui-chart__column-bars">
          {index === focus.active ? <ChartTooltip title={`${point.label} · ${status(point)}`} className={tooltipEdge(index, data.length)}>
            <strong>{formatValue(point.valueCents)}</strong>{index > 0 ? <span>{change(index)} vs. {data[index - 1]!.axisLabel ?? data[index - 1]!.label}</span> : null}
          </ChartTooltip> : null}
          {point.valueCents > 0n ? <span className={`ui-chart__column ${point.projected ? 'ui-chart__column--projected' : 'ui-chart__column--neutral'}`} style={{ height: `${percentage(point.valueCents, scale)}%` }} /> : null}
        </div>
        <span className="ui-chart__column-label">{point.axisLabel ?? point.label}</span>
      </div>)}
    </div>
    <ChartAnnouncement text={active ? `${active.label}, ${status(active)}, ${formatValue(active.valueCents)}` : ''} />
    <ChartDetails collapsible={collapsibleDetails}>
      <table className="ui-chart-table" aria-label={`Valores: ${title}`}>
        <thead><tr><th scope="col">Período</th><th scope="col">Situação</th><th scope="col">Valor</th><th scope="col">vs. anterior</th></tr></thead>
        <tbody>{data.map((point, index) => <tr key={index} {...focus.row(index)}>
          <th scope="row">{point.label}</th><td>{status(point)}</td><td>{formatValue(point.valueCents)}</td><td>{change(index)}</td>
        </tr>)}</tbody>
      </table>
    </ChartDetails>
  </figure>;
}
