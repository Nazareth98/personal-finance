export type PluggyAccount = {
  id: string;
  name?: string | null;
  type?: string | null;
  subtype?: string | null;
  creditData?: {
    balanceCloseDate?: string | number | null;
    balanceDueDate?: string | number | null;
    closingDate?: string | number | null;
    dueDate?: string | number | null;
    creditLimit?: number | string | null;
  } | null;
};

export type PluggyTransaction = {
  id: string;
  accountId: string;
  description?: string | null;
  amount: number | string;
  date: string;
  type?: string | null;
  category?: string | { name?: string | null } | null;
  merchant?: string | { name?: string | null } | null;
  creditCardMetadata?: {
    installmentNumber?: number | null;
    totalInstallments?: number | null;
    installmentId?: string | null;
    originalTransactionId?: string | null;
    billId?: string | null;
  } | null;
};

export function centsFromPluggy(value: number | string): bigint {
  const decimal = typeof value === 'number' ? value.toFixed(2) : value.trim().replace(',', '.');
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(decimal);
  if (!match) throw new RangeError('Invalid Pluggy monetary value');
  const [, sign, units, fraction = ''] = match;
  const cents = BigInt(units) * 100n + BigInt(fraction.padEnd(2, '0'));
  return sign === '-' ? -cents : cents;
}

export function accountTypeFromPluggy(account: PluggyAccount): 'checking' | 'savings' | 'investment' | 'credit_card' {
  const providerType = `${account.type ?? ''} ${account.subtype ?? ''}`.toUpperCase();
  if (providerType.includes('CREDIT')) return 'credit_card';
  if (providerType.includes('SAVING')) return 'savings';
  if (providerType.includes('INVEST')) return 'investment';
  return 'checking';
}

export function sanitizedDescription(value?: string | null): string {
  const normalized = value?.replace(/\s+/g, ' ').trim() || 'Lançamento importado';
  return normalized.slice(0, 120).padEnd(Math.min(3, normalized.length + 2), '.');
}

export function rawCategory(transaction: PluggyTransaction): string | null {
  if (typeof transaction.category === 'string') return transaction.category.slice(0, 120);
  return transaction.category?.name?.slice(0, 120) ?? null;
}

export function merchantName(transaction: PluggyTransaction): string | null {
  if (typeof transaction.merchant === 'string') return transaction.merchant.slice(0, 120);
  return transaction.merchant?.name?.slice(0, 120) ?? null;
}

function normalizedEvidence(value: string | null): string {
  return (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function ledgerSemantics(transaction: PluggyTransaction): {
  nature: 'income' | 'expense' | 'own_transfer' | 'card_payment';
  reporting: 'income' | 'expense' | 'neutral';
  categoryId: 'transfers' | null;
  classificationStatus: 'automatic' | 'uncategorized';
} {
  const amount = centsFromPluggy(transaction.amount);
  if (amount === 0n) throw new RangeError('Pluggy transaction cannot be zero');
  const evidence = normalizedEvidence(rawCategory(transaction));
  if (evidence.includes('transfer')) {
    return { nature: 'own_transfer', reporting: 'neutral', categoryId: 'transfers', classificationStatus: 'automatic' };
  }
  if (evidence.includes('credit card payment') || evidence.includes('pagamento de fatura')) {
    return { nature: 'card_payment', reporting: 'neutral', categoryId: null, classificationStatus: 'automatic' };
  }
  return amount > 0n
    ? { nature: 'income', reporting: 'income', categoryId: null, classificationStatus: 'uncategorized' }
    : { nature: 'expense', reporting: 'expense', categoryId: null, classificationStatus: 'uncategorized' };
}
