import type { ReactNode } from 'react';
import { CategoryPiggyBankIcon, CategoryTagIcon, Icon, type VisualSelectOption } from '@personal-finance/ui';
import type { Category, FinancialAccount, SavingsBox, TransactionContract } from '@personal-finance/domain';
import type { AccountInstitution } from '../ledger/contracts';
import { CategoryIdentityIcon } from './CategoryIdentity';
import { InstitutionLogo } from './InstitutionLogo';
import { formatCentsBRL, formatLocalDate } from '../lib/demo-transactions';

/** Opções de `VisualSelect` com o ícone de cada coisa: logo do banco, identidade da categoria, caixinha (D-081). */

const accountTypeLabels: Record<FinancialAccount['type'], string> = {
  checking: 'Conta corrente', savings: 'Reserva/poupança', investment: 'Investimento', credit_card: 'Cartão de crédito'
};

/** Quadrado neutro com ícone, para opções sem identidade própria (“Todas”, “Sem categoria”, caixinha). */
export function OptionTile({ icon }: { icon: Parameters<typeof Icon>[0]['icon'] }) {
  return <span className="option-tile" aria-hidden="true"><Icon icon={icon} /></span>;
}

export const allOption = (label = 'Todas', visual: ReactNode = <OptionTile icon={CategoryTagIcon} />): VisualSelectOption =>
  ({ value: '', label, visual });

/** `compact` tira a linha do tipo de conta: em filtros, o campo fica com a altura dos demais. */
export function accountOption(account: FinancialAccount, institutions?: readonly AccountInstitution[], label = account.name, compact = false): VisualSelectOption {
  return { value: account.id, label, ...(compact ? {} : { description: accountTypeLabels[account.type] }),
    visual: <InstitutionLogo accountId={account.id} accountName={account.name} institutions={institutions} /> };
}

export function categoryOption(category: Pick<Category, 'id' | 'name' | 'iconKey' | 'colorKey' | 'archivedAt'>): VisualSelectOption {
  return { value: category.id, label: category.archivedAt ? `${category.name} (arquivada)` : category.name,
    visual: <CategoryIdentityIcon iconKey={category.iconKey} colorKey={category.colorKey} /> };
}

export function savingsBoxOption(box: Pick<SavingsBox, 'id' | 'name'>): VisualSelectOption {
  return { value: box.id, label: box.name, visual: <OptionTile icon={CategoryPiggyBankIcon} /> };
}

/** Lançamento: logo da conta, descrição, data e conta abaixo, valor à direita. */
export function transactionOption(transaction: TransactionContract, accounts: readonly FinancialAccount[],
  institutions?: readonly AccountInstitution[], value = transaction.id): VisualSelectOption {
  const accountName = accounts.find(account => account.id === transaction.accountId)?.name ?? 'Conta';
  const amount = transaction.amountCents < 0n ? -transaction.amountCents : transaction.amountCents;
  return { value, label: transaction.description, description: `${formatLocalDate(transaction.eventDate)} · ${accountName}`,
    aside: <strong>{formatCentsBRL(amount)}</strong>, keywords: accountName,
    visual: <InstitutionLogo accountId={transaction.accountId} accountName={accountName} institutions={institutions} /> };
}
