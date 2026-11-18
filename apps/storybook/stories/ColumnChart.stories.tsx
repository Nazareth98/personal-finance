import type { Meta, StoryObj } from '@storybook/react-vite';
import { ColumnChart } from '@personal-finance/ui';

const format = (v: bigint) => `R$ ${(v / 100n).toLocaleString('pt-BR')},${String(v % 100n).padStart(2, '0')}`;
const values = [
  { label: 'out/2026', valueCents: 0n },
  { label: 'nov/2026', valueCents: 12000n, current: true },
  { label: 'dez/2026', valueCents: 12000n, projected: true },
  { label: 'jan/2027', valueCents: 4500n, projected: true }
];
const meta = { title: 'Charts/ColumnChart', component: ColumnChart, tags: ['autodocs'],
  args: { data: values, formatValue: format, title: 'Compromissos de cartão por mês', valueLabel: 'Fatura' } } satisfies Meta<typeof ColumnChart>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const CollapsedValues: Story = { args: { collapsibleDetails: true } };
export const Empty: Story = { args: { data: [] } };
