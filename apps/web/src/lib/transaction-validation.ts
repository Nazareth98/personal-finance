export type TransactionKind = 'income' | 'expense' | 'transfer';
export type TransactionDraft = {
  description: string;
  amount: string;
  kind: TransactionKind;
  account: string;
  confirmedDemo: boolean;
};
export type TransactionErrors = Partial<Record<keyof TransactionDraft, string>>;

/** Converte valor digitado pt-BR em centavos inteiros, sem cálculos em ponto flutuante. */
export function parseBrlCents(input: string): bigint | null {
  const value = input.trim();
  if (!/^(?:[0-9]{1,3}(?:\.[0-9]{3})+|[0-9]+)(?:,[0-9]{1,2})?$/.test(value)) return null;
  const [integers, decimals = ''] = value.split(',');
  return BigInt(integers.replace(/\./g, '')) * 100n + BigInt(decimals.padEnd(2, '0'));
}

export function validateTransactionDraft(draft: TransactionDraft): TransactionErrors {
  const errors: TransactionErrors = {};
  if (draft.description.trim().length < 3) errors.description = 'Informe uma descrição com pelo menos 3 caracteres.';
  if (draft.description.trim().length > 120) errors.description = 'A descrição deve ter no máximo 120 caracteres.';
  const cents = parseBrlCents(draft.amount);
  if (cents === null || cents <= 0n) errors.amount = 'Informe um valor positivo em reais, como 123,45.';
  if (!['income', 'expense', 'transfer'].includes(draft.kind)) errors.kind = 'Selecione um tipo válido.';
  if (!['checking', 'savings'].includes(draft.account)) errors.account = 'Selecione uma conta de demonstração.';
  if (!draft.confirmedDemo) errors.confirmedDemo = 'Confirme que esta operação não grava dados reais.';
  return errors;
}
