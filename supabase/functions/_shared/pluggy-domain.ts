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
    availableCreditLimit?: number | string | null;
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

export type PluggyConnector = { id: number; name: string; isOpenFinance?: boolean | null; aliases?: readonly string[] };
/** Conector agregador: a conex\u00e3o \u00e9 do MeuPluggy, n\u00e3o do banco; o banco de cada conta vem do nome dela. */
export const MEU_PLUGGY_CONNECTOR_ID = 200;
const GENERIC_NAME_WORDS = new Set(['banco', 'bank', 'conta', 'cartao', 'de', 'do', 'da']);

/**
 * Bancos com conector conhecido na Pluggy, conferidos pelos \u00edcones do CDN em 19/11/2026. O cat\u00e1logo
 * `GET /connectors` com a chave do MeuPluggy s\u00f3 devolve o pr\u00f3prio MeuPluggy (D-056, log `size: 1`).
 * shortcut: lista curta e manual; inclua o banco aqui quando conectar outro pelo MeuPluggy.
 */
export const KNOWN_BANKS: readonly PluggyConnector[] = [
  { id: 201, name: 'Ita\u00fa' }, { id: 219, name: 'Caixa Econ\u00f4mica Federal' }, { id: 203, name: 'Bradesco' },
  { id: 208, name: 'Santander' }, { id: 211, name: 'Banco do Brasil' }, { id: 212, name: 'Nubank', aliases: ['nu pagamentos', 'nu financeira', 'nuconta'] },
  { id: 215, name: 'Banco Inter' }, { id: 226, name: 'C6 Bank' }, { id: 214, name: 'BTG Pactual' },
  { id: 206, name: 'Mercado Pago' }, { id: 202, name: 'XP Investimentos' }
];

/**
 * D-056: banco da conta pelo nome (\u201cLATAM PASS ITAU VISA GOLD\u201d \u2192 Ita\u00fa): a primeira palavra pr\u00f3pria do nome do
 * conector precisa aparecer no nome da conta. Mais de um banco poss\u00edvel \u2192 nenhum (sem chute).
 */
export function institutionFromAccountName(accountName: string, connectors: readonly PluggyConnector[] = KNOWN_BANKS): PluggyConnector | undefined {
  const normalized = normalizedEvidence(accountName);
  // D-070: o Nubank chega como “Nu Pagamentos S.A. - Instituição de Pagamento”, sem a palavra Nubank.
  const byAlias = connectors.filter(connector => connector.aliases?.some(alias => ` ${normalized} `.includes(` ${alias} `)));
  if (byAlias.length === 1) return byAlias[0];
  const words = new Set(normalized.split(' '));
  const keyOf = (connector: PluggyConnector) => normalizedEvidence(connector.name).split(' ').find(word => word.length >= 2 && !GENERIC_NAME_WORDS.has(word));
  const matches = connectors.filter(connector => { const key = keyOf(connector); return key !== undefined && words.has(key); })
    .sort((a, b) => Number(Boolean(a.isOpenFinance)) - Number(Boolean(b.isOpenFinance)) || a.id - b.id);
  return new Set(matches.map(keyOf)).size === 1 ? matches[0] : undefined;
}

/** Nome de conta legível: a razão social do Nubank vira “Nubank” (D-070). */
export function displayAccountName(accountName: string): string {
  const bank = institutionFromAccountName(accountName);
  return bank?.aliases?.some(alias => ` ${normalizedEvidence(accountName)} `.includes(` ${alias} `)) ? bank.name : accountName;
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
  // D-075: investimentos também são aporte/resgate (dinheiro mudando de lugar), não despesa nem receita.
  const savingsEvidence = /\b(?:cofrinhos?|caixinhas?|reservas?|savings?|rdb|cdb|lci|lca|tesouro|investimentos?)\b/.test(evidence);
  if (amount > 0n && /\bvalor recebido de investimentos?\b/.test(evidence)) {
    return { nature: 'savings_withdrawal', reporting: 'neutral', categoryId: 'savings', classificationStatus: 'automatic' };
  }
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

/** Crédito no cartão que é o pagamento da fatura (“PGTO BOLETO …”, “PAGAMENTO COM SALDO”). */
function isCardPaymentMirror(transaction: PluggyTransaction): boolean {
  // Sem “pag” sozinho: “PAG*LOJA” é estabelecimento e o estorno dele é estorno de verdade.
  return /^(?:pagamento|pagto|pgto)\b/.test(normalizedEvidence(transaction.description ?? ''));
}

export function cardLedgerSemantics(transaction: PluggyTransaction): {
  amountCents: bigint;
  nature: 'expense' | 'refund' | 'adjustment';
  reporting: 'expense' | 'neutral';
} {
  const amount = centsFromPluggy(transaction.amount);
  if (amount === 0n) throw new RangeError('Pluggy transaction cannot be zero');
  if (isStatementCarryover(transaction)) {
    return { amountCents: amount < 0n ? amount : -amount, nature: 'adjustment', reporting: 'neutral' };
  }
  const magnitude = amount < 0n ? -amount : amount;
  const credit = transaction.type?.toUpperCase() === 'CREDIT' || (!transaction.type && amount < 0n);
  // D-053: o pagamento visto pelo cartão espelha o débito na conta, que é quem quita a fatura;
  // como estorno ele abatia gasto e fatura, e como pagamento contava duas vezes.
  if (ledgerSemantics(transaction).nature === 'card_payment' || (credit && isCardPaymentMirror(transaction))) {
    return { amountCents: magnitude, nature: 'adjustment', reporting: 'neutral' };
  }
  return credit
    ? { amountCents: magnitude, nature: 'refund', reporting: 'expense' }
    : { amountCents: -magnitude, nature: 'expense', reporting: 'expense' };
}
