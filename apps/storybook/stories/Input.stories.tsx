import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from '@personal-finance/ui';

const meta = {
  title: 'Components/Input',
  component: Input,
  tags: ['autodocs'],
  args: { label: 'Descrição', placeholder: 'Ex.: Supermercado', hint: 'Utilize um nome que identifique o lançamento.' }
} satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Error: Story = { args: { error: 'A descrição é obrigatória.', hint: undefined } };
export const Disabled: Story = { args: { disabled: true } };
