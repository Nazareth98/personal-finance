import type { Meta, StoryObj } from '@storybook/react-vite';
import { DivergingColumnChart } from '@personal-finance/ui';

const format = (v: bigint) => `${v < 0n ? '− ' : ''}R$ ${((v < 0n ? -v : v) / 100n).toLocaleString('pt-BR')},${String((v < 0n ? -v : v) % 100n).padStart(2, '0')}`;
const values = [
  { label: 'dez/2026', axisLabel: 'dez', valueCents: 1000n },
  { label: 'jan/2027', axisLabel: 'jan', valueCents: -42000n },
  { label: 'fev/2027', axisLabel: 'fev', valueCents: 38000n },
  { label: 'mar/2027', axisLabel: 'mar', valueCents: 76000n },
  { label: 'abr/2027', axisLabel: 'abr', valueCents: 101000n },
  { label: 'mai/2027', axisLabel: 'mai', valueCents: 120000n }
];
const meta = { title: 'Charts/DivergingColumnChart', component: DivergingColumnChart, tags: ['autodocs'],
  args: { data: values, formatValue: format, title: 'Resultado previsto por mês', positiveLabel: 'Sobra', negativeLabel: 'Falta' } } satisfies Meta<typeof DivergingColumnChart>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const OnlyPositive: Story = { args: { data: values.map(point => ({ ...point, valueCents: point.valueCents < 0n ? 5000n : point.valueCents })) } };
export const CollapsedValues: Story = { args: { collapsibleDetails: true } };
export const Empty: Story = { args: { data: [] } };
