import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import { OverviewPage } from '../../web/src/pages/OverviewPage';
import { TransactionsPage } from '../../web/src/pages/TransactionsPage';
import { AccountsPage } from '../../web/src/pages/AccountsPage';
import { CardsPage } from '../../web/src/pages/CardsPage';
import { BudgetsPage } from '../../web/src/pages/BudgetsPage';
import { ReportsPage } from '../../web/src/pages/ReportsPage';
import '../../web/src/styles.css';

const meta = {
  title: 'Templates/Personal Finance',
  component: OverviewPage,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' }
} satisfies Meta<typeof OverviewPage>;
export default meta;
type Story = StoryObj<typeof meta>;
const frame = (children: ReactNode) => <div style={{
  width: 'min(1120px, 100%)', margin: '0 auto', padding: '24px',
  background: 'var(--color-bg-canvas)', color: 'var(--color-text-primary)'
}}>{children}</div>;
export const Overview: Story = { render: () => frame(<OverviewPage/>) };
export const Transactions: Story = { render: () => frame(<TransactionsPage/>) };
export const Accounts: Story = { render: () => frame(<AccountsPage/>) };
export const CardsAndInvoices: Story = { render: () => frame(<CardsPage/>) };
export const Budgets: Story = { render: () => frame(<BudgetsPage/>) };
export const Reports: Story = { render: () => frame(<ReportsPage/>) };
