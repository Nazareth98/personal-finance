import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@personal-finance/ui';

const meta = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  args: { children: 'Adicionar transação', variant: 'primary', size: 'md' },
  argTypes: {
    variant: { control: 'select', options: ['primary','secondary','ghost','danger'] },
    size: { control: 'select', options: ['sm','md','lg'] }
  }
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Primary: Story = {};
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Destructive: Story = { args: { variant: 'danger', children: 'Excluir movimentação' } };
export const Disabled: Story = { args: { disabled: true } };
