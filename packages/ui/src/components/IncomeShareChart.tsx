import { ChartAnnouncement, ChartTooltip, useChartFocus } from './ChartInteraction';
import { ChartDetails } from './ChartDetails';
import { EmptyState } from './EmptyState';

/** Uma fatia da receita: categoria de despesa, aporte ou sobra. `color` é um valor CSS (ex.: `var(--color-chart-category-3)`). */
export type IncomeShareSegment = { key: string; label: string; valueCents: bigint; color: string; detail?: string; muted?: boolean };

export type IncomeShareChartProps = {
  title: string;
  incomeCents: bigint;
  /** Na ordem em que aparecem na barra. */
  segments: readonly IncomeShareSegment[];
  formatValue: (value: bigint) => string;
  /** Rótulo da referência de 100% (“Receita prevista”). */
  incomeLabel?: string;
  /** Colunas extras da tabela por segmento (ex.: fixos, meta). */
  extraColumns?: readonly { header: string; cell: (segment: IncomeShareSegment) => string }[];
  collapsibleDetails?: boolean;
};

const share = (part: bigint, total: bigint) => total > 0n ? Number(part * 10000n / total) / 100 : 0;
const pct = (value: number) => `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

/**
 * Barra de 100% da receita (D-085): cada despesa é uma faixa com a cor da categoria; o que passar da receita fica em
 * `status-danger` à direita. Tabela equivalente com valor e % da receita — a informação não depende só de cor.
 */
export function IncomeShareChart({ title, incomeCents, segments, formatValue, incomeLabel = 'Receita', extraColumns = [], collapsibleDetails }: IncomeShareChartProps) {
  const visible = segments.filter(segment => segment.valueCents > 0n);
  const focus = useChartFocus(visible.length, 0);
  if (incomeCents <= 0n && !visible.length) return <EmptyState title="Sem valores para o gráfico" description="Ainda não há receita nem despesas neste mês." />;
  const spent = visible.reduce((sum, segment) => sum + segment.valueCents, 0n);
  const base = spent > incomeCents ? spent : incomeCents;
  const overflow = spent > incomeCents && incomeCents > 0n ? spent - incomeCents : 0n;
  // Centro de cada faixa (em % da barra), para ancorar o tooltip.
  const centers = visible.reduce<number[]>((list, segment, index) => {
    const start = index ? list[index - 1]! + share(visible[index - 1]!.valueCents, base) / 2 : 0;
    return [...list, start + share(segment.valueCents, base) / 2];
  }, []);
  const active = focus.active === null ? undefined : visible[focus.active];
  const ofIncome = (segment: IncomeShareSegment) => incomeCents > 0n ? `${pct(share(segment.valueCents, incomeCents))} da ${incomeLabel.toLowerCase()}` : 'Sem receita';
  const edge = (center: number) => center < 18 ? ' ui-chart-tooltip--start' : center > 82 ? ' ui-chart-tooltip--end' : '';
  const summary = incomeCents > 0n ? `${pct(share(spent, incomeCents))} da receita` : 'Sem receita';
  return <figure className="ui-chart ui-income-share" aria-label={title}>
    <div className="ui-income-share__scale" aria-hidden="true"><span>{formatValue(0n)}</span>
      <span>{incomeLabel}: <strong>{formatValue(incomeCents)}</strong>{overflow > 0n ? <> · passa {formatValue(overflow)}</> : null}</span></div>
    <div className="ui-income-share__plot" role="group" aria-label={`${title}: use as setas para percorrer as categorias`} {...focus.plot}>
      {active && focus.active !== null ? <ChartTooltip title={active.label} className={edge(centers[focus.active]!)} style={{ left: `${centers[focus.active]}%` }}>
        <strong>{formatValue(active.valueCents)}</strong><span>{ofIncome(active)}</span>
        {extraColumns.filter(column => column.cell(active) !== '—').map(column => <span key={column.header} className="ui-chart-tooltip__row">{column.header} <strong>{column.cell(active)}</strong></span>)}
        {active.detail ? <span>{active.detail}</span> : null}
      </ChartTooltip> : null}
      <div className={`ui-income-share__track${active ? ' has-active' : ''}`} aria-hidden="true">
        {visible.map((segment, index) => <span key={segment.key} {...focus.point(index)}
          className={`ui-income-share__segment${segment.muted ? ' is-muted' : ''}${index === focus.active ? ' is-active' : ''}`}
          style={{ width: `${share(segment.valueCents, base)}%`, background: segment.color }} />)}
        {incomeCents > 0n && overflow > 0n ? <span className="ui-income-share__limit" style={{ left: `${share(incomeCents, base)}%` }} /> : null}
      </div>
    </div>
    <ChartAnnouncement text={active ? `${active.label}, ${formatValue(active.valueCents)}, ${ofIncome(active)}` : ''} />
    <div className="ui-chart__legend" aria-hidden="true">{visible.map(segment => <span key={segment.key}>
      <i className={`ui-chart__swatch${segment.muted ? ' is-muted' : ''}`} style={{ background: segment.color }} />{segment.label}</span>)}</div>
    <ChartDetails collapsible={collapsibleDetails} summary={summary}>
      <table className="ui-chart-table" aria-label={`Valores: ${title}`}>
        <thead><tr><th scope="col">Categoria</th><th scope="col">Valor</th>{extraColumns.map(column => <th key={column.header} scope="col">{column.header}</th>)}<th scope="col">% da receita</th></tr></thead>
        <tbody>{visible.map((segment, index) => <tr key={segment.key} {...focus.row(index)}><th scope="row"><span className="ui-income-share__row-label">
          <i className="ui-chart__swatch" style={{ background: segment.color }} aria-hidden="true" />{segment.label}</span></th>
          <td>{formatValue(segment.valueCents)}</td>{extraColumns.map(column => <td key={column.header}>{column.cell(segment)}</td>)}
          <td>{incomeCents > 0n ? pct(share(segment.valueCents, incomeCents)) : '—'}</td></tr>)}</tbody>
      </table>
    </ChartDetails>
  </figure>;
}
