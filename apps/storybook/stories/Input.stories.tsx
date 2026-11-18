import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Icon, Input, LockIcon, MailIcon, ShowIcon } from '@personal-finance/ui';

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
export const WithLeadingIcon: Story = { args: { label: 'E-mail', type: 'email', leadingIcon: MailIcon, hint: undefined, placeholder: undefined } };
export const WithTrailingControl: Story = { args: { label: 'Senha', type: 'password', leadingIcon: LockIcon, hint: undefined, placeholder: undefined,
  trailing: <Button variant="ghost" size="sm" aria-label="Mostrar senha"><Icon icon={ShowIcon} size="sm" /></Button> } };
