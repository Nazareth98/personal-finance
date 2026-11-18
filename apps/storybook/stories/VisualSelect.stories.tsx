import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { CategoryCarIcon, CategoryHomeIcon, CategoryUtensilsIcon, Icon, VisualSelect } from '@personal-finance/ui';

const options = [
  { value: 'home', label: 'Moradia', visual: <Icon icon={CategoryHomeIcon} size="sm" /> },
  { value: 'food', label: 'Alimentação', visual: <Icon icon={CategoryUtensilsIcon} size="sm" /> },
  { value: 'car', label: 'Transporte', visual: <Icon icon={CategoryCarIcon} size="sm" />, disabled: true }
];

const meta = {
  title: 'Forms/VisualSelect', component: VisualSelect, tags: ['autodocs'],
  args: { label: 'Ícone', value: 'home', options, onChange: () => {} },
  render: args => {
    const [value, setValue] = useState(args.value);
    return <VisualSelect {...args} value={value} onChange={setValue} />;
  }
} satisfies Meta<typeof VisualSelect>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const WithHint: Story = { args: { hint: 'Opção desativada não pode ser escolhida.' } };
export const Invalid: Story = { args: { error: 'Selecione um ícone.' } };
export const Disabled: Story = { args: { disabled: true } };
