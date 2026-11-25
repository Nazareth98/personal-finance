import { normalizeClassificationText } from './classification.ts';
import type { TransactionContract } from './finance.ts';

/** D-084: fixo é o lançamento que se repete (aluguel, luz, salário), não o valor. */
export type FixedItem = {
  id: string;
  name: string;
  nature: 'income' | 'expense';
  categoryId?: string;
  /** Descrição normalizada que identifica os lançamentos iguais. */
  matchKey: string;
  endedAt?: string;
};

export type FixedItemLink = { transactionId: string; fixedItemId: string; linkedBy: 'owner' | 'auto_similar' };

export type FixedItemMonthStatus = 'done' | 'pending' | 'late';

type Tx = Pick<TransactionContract, 'id' | 'description' | 'amountCents' | 'eventDate' | 'competence'>;

const abs = (value: bigint) => value < 0n ? -value : value;

/** Lançamentos vinculados ao fixo, do mais recente ao mais antigo (competência, depois data). */
export function fixedItemTransactions<T extends Tx>(itemId: string, links: readonly FixedItemLink[], transactions: readonly T[]): T[] {
  const ids = new Set(links.filter(link => link.fixedItemId === itemId).map(link => link.transactionId));
  return transactions.filter(transaction => ids.has(transaction.id))
    .sort((a, b) => b.competence.localeCompare(a.competence) || b.eventDate.localeCompare(a.eventDate));
}

/**
 * Valor que o fixo projeta para os próximos meses: o do último mês com vínculo (somando os lançamentos daquele mês,
 * caso o fixo tenha caído mais de uma vez nele). Sempre positivo; sem vínculo, 0.
 */
export function fixedItemLastValue(itemId: string, links: readonly FixedItemLink[], transactions: readonly Tx[]): { cents: bigint; competence?: string } {
  const linked = fixedItemTransactions(itemId, links, transactions);
  const latest = linked[0]?.competence;
  if (!latest) return { cents: 0n };
  return { cents: linked.filter(item => item.competence === latest).reduce((sum, item) => sum + abs(item.amountCents), 0n), competence: latest };
}

/**
 * Situação do fixo numa competência: com vínculo nela, `done`; sem vínculo, `late` quando hoje (na mesma competência)
 * passou do dia habitual + 3 — dia habitual é o primeiro dia com vínculo no último mês —, senão `pending`.
 */
export function fixedItemMonthStatus(itemId: string, links: readonly FixedItemLink[], transactions: readonly Tx[], competence: string, today: string): FixedItemMonthStatus {
  const linked = fixedItemTransactions(itemId, links, transactions);
  if (linked.some(item => item.competence === competence)) return 'done';
  if (!linked[0]) return 'pending';
  const current = today.slice(0, 7);
  if (competence < current) return 'late';
  if (competence > current) return 'pending';
  const usualDay = Math.min(...linked.filter(item => item.competence === linked[0]!.competence).map(item => Number(item.eventDate.slice(8, 10))));
  return Number(today.slice(8, 10)) > usualDay + 3 ? 'late' : 'pending';
}

/** Lançamentos iguais (mesma descrição normalizada e mesmo sinal) ainda sem fixo — candidatos a “vincular também”. */
export function similarWithoutFixed<T extends Tx>(transaction: Tx, transactions: readonly T[], links: readonly FixedItemLink[]): T[] {
  const key = normalizeClassificationText(transaction.description);
  if (!key) return [];
  const linked = new Set(links.map(link => link.transactionId));
  const negative = transaction.amountCents < 0n;
  return transactions.filter(candidate => candidate.id !== transaction.id && !linked.has(candidate.id)
    && (candidate.amountCents < 0n) === negative && normalizeClassificationText(candidate.description) === key);
}

/** Nome sugerido ao criar um fixo: a descrição sem números longos, com iniciais maiúsculas. */
export function suggestFixedItemName(description: string): string {
  const words = description.replace(/\b\d{3,}\b/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().toLowerCase().split(/\s+/).filter(Boolean);
  const name = words.map(word => word.length <= 2 ? word : word[0]!.toUpperCase() + word.slice(1)).join(' ');
  return (name ? name[0]!.toUpperCase() + name.slice(1) : 'Fixo').slice(0, 80);
}
