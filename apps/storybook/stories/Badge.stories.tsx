import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from '@personal-finance/ui';

const meta = {
  title: 'Components/Badge',
  component: Badge,
  tags: ['autodocs'],
  args: { children: 'Receita', tone: 'income' },
  argTypes: { tone: { control: 'select', options: ['neutral', 'income', 'expense', 'transfer'] } }
} satisfies Meta<typeof Badge>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Income: Story = {};
export const Expense: Story = { args: { tone: 'expense', children: 'Despesa' } };
export const Transfer: Story = { args: { tone: 'transfer', children: 'Transferência própria' } };
