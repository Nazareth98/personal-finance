import { proposalSchema, type Proposal } from "../domain/finance";

export interface PluggyTransaction {
  id: string;
  description: string;
  descriptionRaw?: string | null;
  amount: number;
  date: string;
  status?: "POSTED" | "PENDING" | string;
  category?: string | null;
  categoryId?: string | null;
  accountId?: string;
}

export interface MapPluggyOptions {
  accountKind?: "checking" | "credit" | "savings" | "cash" | "benefit" | "loan";
  includePending?: boolean;
}

/**
 * Converte uma transação da Pluggy para o formato canônico Proposal do sistema de finanças.
 *
 * Regras financeiras:
 * 1. Para contas bancárias normais (checking, savings, etc.):
 *    - amount < 0 => saída/despesa (nature: 'expense', amount_cents negativo)
 *    - amount > 0 => entrada/receita (nature: 'income', amount_cents positivo)
 * 2. Para cartões de crédito (credit):
 *    - amount > 0 => compra/débito na fatura (nature: 'expense', amount_cents negativo)
 *    - amount < 0 => estorno/pagamento (nature: 'refund', amount_cents positivo)
 * 3. Precisão exata em centavos (bigint). Valores zerados são ignorados.
 * 4. Idempotência garantida via external_key: `pluggy:${id}`.
 */
export function mapPluggyTransaction(
  tx: PluggyTransaction,
  options: MapPluggyOptions = {},
): Proposal | null {
  // Ignorar transações pendentes se não solicitado
  if (tx.status === "PENDING" && !options.includePending) {
    return null;
  }

  // Ignorar transações de valor 0
  if (Math.abs(tx.amount) < 0.005) {
    return null;
  }

  const isCreditCard = options.accountKind === "credit";
  const absCents = BigInt(Math.round(Math.abs(tx.amount) * 100));

  if (absCents === 0n) {
    return null;
  }

  let amountCents: bigint;
  let nature: Proposal["nature"];

  if (isCreditCard) {
    // Na fatura de cartão: valor positivo = compra efetuada (despesa)
    // valor negativo = estorno ou pagamento de fatura
    if (tx.amount > 0) {
      amountCents = -absCents;
      nature = "expense";
    } else {
      amountCents = absCents;
      nature = "refund";
    }
  } else {
    // Em conta bancária: valor negativo = saída/débito
    // valor positivo = entrada/crédito
    if (tx.amount < 0) {
      amountCents = -absCents;
      nature = "expense";
    } else {
      amountCents = absCents;
      nature = "income";
    }
  }

  const rawDate = tx.date ? tx.date.slice(0, 10) : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    return null;
  }

  const desc = (tx.descriptionRaw || tx.description || "Transação Pluggy").trim();
  const competence = `${rawDate.slice(0, 7)}-01`;

  const parsed = proposalSchema.safeParse({
    description: desc.slice(0, 500),
    amount_cents: amountCents.toString(),
    event_date: rawDate,
    bank_date: rawDate,
    competence,
    nature,
    external_key: `pluggy:${tx.id}`,
    original_text: JSON.stringify(tx),
  });

  return parsed.success ? parsed.data : null;
}

/**
 * Converte uma lista de transações da Pluggy em um lote de Proposals.
 */
export function mapPluggyTransactions(
  transactions: PluggyTransaction[],
  options: MapPluggyOptions = {},
): { rows: Proposal[]; warnings: string[] } {
  const rows: Proposal[] = [];
  const warnings: string[] = [];

  for (const [index, tx] of transactions.entries()) {
    try {
      const proposal = mapPluggyTransaction(tx, options);
      if (proposal) {
        rows.push(proposal);
      }
    } catch (e) {
      warnings.push(
        `Transação ${index + 1} (${tx.id || "sem ID"}): ${e instanceof Error ? e.message : "Falha ao mapear."}`,
      );
    }
  }

  return { rows, warnings };
}

