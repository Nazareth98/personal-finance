import type { Meta, StoryObj } from '@storybook/react-vite';
import { AccountsIcon, BrandIcon, BudgetsIcon, CardsIcon, DashboardIcon, Icon, ReportsIcon, TransactionsIcon } from '@personal-finance/ui';

const meta = {
  title: 'Foundations/Icons', component: Icon, tags: ['autodocs'],
  args: { icon: DashboardIcon, size: 'md' },
  argTypes: { size: { control: 'select', options: ['sm', 'md', 'lg'] } }
} satisfies Meta<typeof Icon>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Accessible: Story = { args: { label: 'Visão geral' } };
export const NavigationSet: Story = {
  render: () => <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
    {[BrandIcon, DashboardIcon, TransactionsIcon, AccountsIcon, CardsIcon, BudgetsIcon, ReportsIcon]
      .map((icon, index) => <Icon key={index} icon={icon} size="lg" />)}
  </div>
};
