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
  status?: string | null;
  operationType?: string | null;
  providerId?: string | null;
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
  return (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function ledgerSemantics(transaction: PluggyTransaction): {
  nature: 'income' | 'expense' | 'card_payment' | 'savings_contribution' | 'savings_withdrawal';
  reporting: 'income' | 'expense' | 'neutral';
  categoryId: 'savings' | null;
  classificationStatus: 'automatic' | 'uncategorized';
} {
  const amount = centsFromPluggy(transaction.amount);
  if (amount === 0n) throw new RangeError('Pluggy transaction cannot be zero');
  const evidence = normalizedEvidence(`${rawCategory(transaction) ?? ''} ${transaction.operationType ?? ''} ${transaction.description ?? ''}`);
  if (/\b(?:credit card payment|pagamento (?:de )?fatura|pagamento (?:de )?cartao)\b/.test(evidence)) {
    return { nature: 'card_payment', reporting: 'neutral', categoryId: null, classificationStatus: 'automatic' };
  }
  const savingsEvidence = /\b(?:cofrinhos?|caixinhas?|reservas?|savings?)\b/.test(evidence);
  if (amount > 0n && savingsEvidence && /\b(?:resgate|withdrawal)\b/.test(evidence)) {
    return { nature: 'savings_withdrawal', reporting: 'neutral', categoryId: 'savings', classificationStatus: 'automatic' };
  }
  if (amount < 0n && savingsEvidence && /\b(?:aporte|aplicacao|deposito)\b/.test(evidence)) {
    return { nature: 'savings_contribution', reporting: 'neutral', categoryId: 'savings', classificationStatus: 'automatic' };
  }
  return amount > 0n
    ? { nature: 'income', reporting: 'income', categoryId: null, classificationStatus: 'uncategorized' }
    : { nature: 'expense', reporting: 'expense', categoryId: null, classificationStatus: 'uncategorized' };
}

/**
 * Linha informativa do extrato do cartão (Caixa: “TOTAL DA FATURA ANTERIOR”) que repete o total já
 * cobrado na fatura anterior. Não é compra nem pagamento (D-050): entra neutra e fora da fatura.
 */
export function isStatementCarryover(transaction: PluggyTransaction): boolean {
  return /\b(?:total da fatura anterior|saldo (?:da )?fatura anterior|saldo anterior da fatura)\b/.test(normalizedEvidence(transaction.description ?? ''));
}

export function cardLedgerSemantics(transaction: PluggyTransaction): {
  amountCents: bigint;
  nature: 'expense' | 'refund' | 'card_payment' | 'adjustment';
  reporting: 'expense' | 'neutral';
} {
  const amount = centsFromPluggy(transaction.amount);
  if (amount === 0n) throw new RangeError('Pluggy transaction cannot be zero');
  if (isStatementCarryover(transaction)) {
    return { amountCents: amount < 0n ? amount : -amount, nature: 'adjustment', reporting: 'neutral' };
  }
  if (ledgerSemantics(transaction).nature === 'card_payment') {
    return { amountCents: amount < 0n ? amount : -amount, nature: 'card_payment', reporting: 'neutral' };
  }
  const magnitude = amount < 0n ? -amount : amount;
  const credit = transaction.type?.toUpperCase() === 'CREDIT' || (!transaction.type && amount < 0n);
  return credit
    ? { amountCents: magnitude, nature: 'refund', reporting: 'expense' }
    : { amountCents: -magnitude, nature: 'expense', reporting: 'expense' };
}
