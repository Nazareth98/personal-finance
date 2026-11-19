import { addCompetenceMonths, cardStatementDates, cardStatementSummary, type CardStatement, type CardStatementEntry, type CreditCard, type TransactionContract } from '@personal-finance/domain';

/**
 * Opções do seletor “Fatura paga” (D-051). A fatura leva o mês do VENCIMENTO: um pagamento em 15/10 de
 * compras de 09/09 a 08/10 quita a fatura que vence em 15/10. Cada opção traz período, valores e situação;
 * a sugerida (valor igual ao em aberto ou ao total, vencimento próximo) vem primeiro.
 */
export type StatementChoice = {
  statementId: string;
  accountId: string;
  competence: string;
  periodStart: string;
  closingDate: string;
  dueDate: string;
  totalCents: bigint;
  paidCents: bigint;
  openCents: bigint;
  status: 'open' | 'partial' | 'paid';
  suggested: boolean;
  /** Pendente se este pagamento for vinculado (nunca negativo). */
  openAfterCents: bigint;
};

const dayMs = 86_400_000;
const toDay = (date: string) => Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)));
const fromDay = (day: number) => new Date(day).toISOString().slice(0, 10);
export const daysBetween = (a: string, b: string) => Math.round((toDay(a) - toDay(b)) / dayMs);

export function statementChoices(input: {
  payment: Pick<TransactionContract, 'id' | 'amountCents' | 'eventDate'>;
  statements: readonly CardStatement[];
  entries: readonly CardStatementEntry[];
  cards: readonly CreditCard[];
  transactions: readonly TransactionContract[];
}): StatementChoice[] {
  const amount = input.payment.amountCents < 0n ? -input.payment.amountCents : input.payment.amountCents;
  // O próprio pagamento não conta como já pago ao avaliar a fatura em que ele está (ou estaria).
  const entries = input.entries.filter(entry => entry.transactionId !== input.payment.id);
  const choices = input.statements.flatMap(statement => {
    const card = input.cards.find(item => item.id === statement.cardId);
    if (!card) return [];
    const summary = cardStatementSummary(statement, entries, input.transactions);
    const totalCents = summary.purchasesCents - summary.refundsCents;
    const previous = cardStatementDates(addCompetenceMonths(statement.competence, -1), card);
    const periodStart = fromDay(toDay(previous.closingDate) + dayMs);
    const distance = Math.abs(daysBetween(statement.dueDate, input.payment.eventDate));
    const suggested = summary.openCents > 0n && distance <= 20 && (summary.openCents === amount || totalCents === amount);
    const status = summary.openCents === 0n && totalCents > 0n ? 'paid' as const : summary.paymentsCents > 0n ? 'partial' as const : 'open' as const;
    return [{ statementId: statement.id, accountId: card.accountId, competence: statement.competence, periodStart,
      closingDate: statement.closingDate, dueDate: statement.dueDate, totalCents: totalCents < 0n ? 0n : totalCents,
      paidCents: summary.paymentsCents, openCents: summary.openCents, status, suggested,
      openAfterCents: summary.openCents > amount ? summary.openCents - amount : 0n }];
  });
  const rank = (choice: StatementChoice) => choice.suggested ? 0 : choice.status === 'paid' ? 2 : 1;
  return choices.sort((a, b) => rank(a) - rank(b)
    || Math.abs(daysBetween(a.dueDate, input.payment.eventDate)) - Math.abs(daysBetween(b.dueDate, input.payment.eventDate)));
}
