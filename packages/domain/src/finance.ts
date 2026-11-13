export const transactionNatures = [
  'income',
  'expense',
  'own_transfer',
  'card_payment',
  'savings_contribution',
  'savings_withdrawal',
  'adjustment'
] as const;

export type TransactionNature = typeof transactionNatures[number];
export type TransactionSource = 'manual' | 'pluggy';
export type ClassificationStatus = 'automatic' | 'suggested' | 'uncategorized' | 'confirmed';

export type TransactionContract = {
  id: string;
  accountId: string;
  description: string;
  amountCents: bigint;
  nature: TransactionNature;
  source: TransactionSource;
  eventDate: string;
  competence: string;
  classificationStatus: ClassificationStatus;
  externalKey?: string;
};

export function requireNonZeroCents(value: bigint): bigint {
  if (value === 0n) throw new RangeError('O valor financeiro não pode ser zero.');
  return value;
}

export function isConsumption(nature: TransactionNature): boolean {
  return nature === 'expense';
}
