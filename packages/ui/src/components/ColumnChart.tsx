import { percentage } from '../lib/chart-data';
import { ChartDetails } from './ChartDetails';
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
  if (!data.length) return <EmptyState title="Sem valores para o gráfico" description="Adicione períodos para consultar a série." />;
  const scale = data.reduce((max, point) => point.valueCents > max ? point.valueCents : max, 0n);
  const status = (point: ColumnPoint) => point.projected ? projectedLabel : valueLabel;
  return <figure className="ui-chart" aria-label={title}>
    <div className="ui-chart__legend" aria-hidden="true">
      <span><i className="ui-chart__swatch ui-chart__swatch--neutral" /> {valueLabel}</span>
      {data.some(point => point.projected) ? <span><i className="ui-chart__swatch ui-chart__swatch--projected" /> {projectedLabel}</span> : null}
    </div>
    <div className="ui-chart__columns" aria-hidden="true">{data.map((point, index) => <div key={index} className={`ui-chart__column-group${point.current ? ' is-current' : ''}`}>
      <div className="ui-chart__column-bars">
        {point.valueCents > 0n ? <span className={`ui-chart__column ${point.projected ? 'ui-chart__column--projected' : 'ui-chart__column--neutral'}`} style={{ height: `${percentage(point.valueCents, scale)}%` }} /> : null}
      </div>
      <span className="ui-chart__column-label">{point.axisLabel ?? point.label}</span>
    </div>)}</div>
    <figcaption className="ui-sr-only">{title}. Valores por período na tabela.</figcaption>
    <table className="ui-sr-only"><thead><tr><th scope="col">Período</th><th scope="col">Valor</th><th scope="col">Situação</th></tr></thead>
      <tbody>{data.map((point, index) => <tr key={index}><th scope="row">{point.label}</th><td>{formatValue(point.valueCents)}</td><td>{status(point)}</td></tr>)}</tbody></table>
    <ChartDetails collapsible={collapsibleDetails}><div className="ui-chart__details">{data.map((point, index) => <div key={index}>
      <strong>{point.label}</strong><span className="ui-chart__neutral">{formatValue(point.valueCents)}</span>{point.projected ? <span>{projectedLabel}</span> : null}
    </div>)}</div></ChartDetails>
  </figure>;
}
