import type { TransactionContract } from './finance.ts';

export type CreditCard = {
  id: string;
  accountId: string;
  closingDay: number;
  dueDay: number;
  creditLimitCents?: bigint;
};
/** `settledAt`: o dono marcou como paga sem o pagamento estar no app (D-076). */
export type CardStatement = { id: string; cardId: string; competence: string; closingDate: string; dueDate: string; settledAt?: string };
export type CardStatementEntry = {
  id: string;
  statementId: string;
  transactionId: string;
  type: 'purchase' | 'refund' | 'payment';
};
export type CardInstallment = {
  id: string;
  cardId: string;
  statementId: string;
  transactionId?: string;
  description: string;
  number: number;
  total: number;
  amountCents: bigint;
  dueCompetence: string;
  status: 'posted' | 'projected' | 'refunded';
};
export type CardStatementSummary = {
  purchasesCents: bigint;
  refundsCents: bigint;
  paymentsCents: bigint;
  openCents: bigint;
  status: 'open' | 'partial' | 'paid'; settledManually: boolean };

type CardCalendar = { closingDay: number; dueDay: number };

function validDay(day: number): boolean {
  return Number.isInteger(day) && day >= 1 && day <= 31;
}

function parseDate(value: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new RangeError('Data de cartão inválida.');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new RangeError('Data de cartão inválida.');
  return { year, month, day };
}

function monthFromIndex(index: number): { year: number; month: number } {
  return { year: Math.floor(index / 12), month: index % 12 + 1 };
}

function monthIndex(year: number, month: number): number {
  return year * 12 + month - 1;
}

function monthString(index: number): string {
  const { year, month } = monthFromIndex(index);
  return `${year}-${String(month).padStart(2, '0')}`;
}

function calendarDate(index: number, day: number): string {
  const { year, month } = monthFromIndex(index);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
}

function validateCalendar(card: CardCalendar): void {
  if (!validDay(card.closingDay) || !validDay(card.dueDay)) throw new RangeError('Fechamento ou vencimento inválido.');
}

export function cardCompetence(eventDate: string, card: CardCalendar): string {
  validateCalendar(card);
  const event = parseDate(eventDate);
  const closingMonth = monthIndex(event.year, event.month) + (event.day > card.closingDay ? 1 : 0);
  const dueMonth = closingMonth + (card.dueDay <= card.closingDay ? 1 : 0);
  return monthString(dueMonth);
}

/**
 * D-054: a fatura informada pelo banco (billId) vence uma vez, então todas as suas compras ficam na competência
 * da compra mais recente — parcelas chegam com a data da compra original e cairiam numa fatura antiga.
 * shortcut: só enxerga os itens do lote; uma fatura com apenas parcelas antigas no lote fica na competência delas.
 */
export function billCompetences(items: readonly { billId?: string; competence: string }[]): Map<string, string> {
  const result = new Map<string, string>();
  for (const item of items) {
    if (item.billId && item.competence > (result.get(item.billId) ?? '')) result.set(item.billId, item.competence);
  }
  return result;
}

export function cardStatementDates(competence: string, card: CardCalendar): { closingDate: string; dueDate: string } {
  validateCalendar(card);
  const match = /^(\d{4})-(\d{2})$/.exec(competence);
  if (!match) throw new RangeError('Competência de fatura inválida.');
  const dueMonth = monthIndex(Number(match[1]), Number(match[2]));
  const closingMonth = dueMonth - (card.dueDay <= card.closingDay ? 1 : 0);
  return { closingDate: calendarDate(closingMonth, card.closingDay), dueDate: calendarDate(dueMonth, card.dueDay) };
}

export function addCompetenceMonths(competence: string, offset: number): string {
  if (!Number.isInteger(offset)) throw new RangeError('Deslocamento de competência inválido.');
  const match = /^(\d{4})-(\d{2})$/.exec(competence);
  if (!match) throw new RangeError('Competência inválida.');
  return monthString(monthIndex(Number(match[1]), Number(match[2])) + offset);
}

export function projectInstallments(
  firstCompetence: string,
  currentNumber: number,
  total: number,
  installmentAmountCents: bigint
): { number: number; dueCompetence: string; amountCents: bigint; status: 'posted' | 'projected' }[] {
  if (!Number.isInteger(currentNumber) || !Number.isInteger(total) || currentNumber < 1 || total < currentNumber || total > 120) {
    throw new RangeError('Parcelamento inválido.');
  }
  if (installmentAmountCents <= 0n) throw new RangeError('Valor da parcela inválido.');
  return Array.from({ length: total - currentNumber + 1 }, (_, offset) => ({
    number: currentNumber + offset,
    dueCompetence: addCompetenceMonths(firstCompetence, offset),
    amountCents: installmentAmountCents,
    status: offset === 0 ? 'posted' : 'projected'
  }));
}

export function cardStatementSummary(
  statement: CardStatement,
  entries: readonly CardStatementEntry[],
  transactions: readonly TransactionContract[]
): CardStatementSummary {
  const transactionsById = new Map(transactions.map(transaction => [transaction.id, transaction]));
  let purchasesCents = 0n;
  let refundsCents = 0n;
  let paymentsCents = 0n;
  for (const entry of entries.filter(item => item.statementId === statement.id)) {
    const transaction = transactionsById.get(entry.transactionId);
    if (!transaction) throw new RangeError('Entrada de fatura sem lançamento.');
    const magnitude = transaction.amountCents < 0n ? -transaction.amountCents : transaction.amountCents;
    if (entry.type === 'purchase') purchasesCents += magnitude;
    if (entry.type === 'refund') refundsCents += magnitude;
    if (entry.type === 'payment') paymentsCents += magnitude;
  }
  const settled = refundsCents + paymentsCents;
  const remaining = purchasesCents > settled ? purchasesCents - settled : 0n;
  const settledManually = Boolean(statement.settledAt) && remaining > 0n;
  const openCents = settledManually ? 0n : remaining;
  const status = (openCents === 0n && purchasesCents > 0n) || settledManually ? 'paid' : paymentsCents > 0n ? 'partial' : 'open';
  return { purchasesCents, refundsCents, paymentsCents, openCents, status, settledManually };
}
