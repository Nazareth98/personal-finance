import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from '@personal-finance/ui';

const meta = {
  title: 'Components/Card',
  component: Card,
  tags: ['autodocs'],
  args: { children: 'Conteúdo ilustrativo de um painel financeiro.' }
} satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
