import { cardCompetence, cardStatementSummary, type CardInstallment, type CardStatement, type CardStatementEntry, type CreditCard, type FinancialAccount, type TransactionContract } from '@personal-finance/domain';

export type StatementLine = { id: string; description: string; date?: string; detail: string; amountCents: bigint; credit: boolean };
export type StatementTab = {
  competence: string;
  statement?: CardStatement;
  status: 'open' | 'partial' | 'paid' | 'projected';
  purchasesCents: bigint;
  refundsCents: bigint;
  paymentsCents: bigint;
  openCents: bigint;
  projectedCents: bigint;
  lines: StatementLine[];
  settledManually?: boolean;
};
/** `limitSource`: `bank` quando o usado é limite − disponível informado pelo banco; `estimate` quando é soma de faturas e parcelas. */
export type CardPanel = { account: FinancialAccount; card?: CreditCard; committedCents: bigint; tabs: StatementTab[]; limitSource?: 'bank' | 'estimate' };

const entryLabels = { purchase: 'Compra', refund: 'Estorno', payment: 'Pagamento' } as const;

/** Um painel por conta de cartão; cada competência vira uma aba (fatura materializada e/ou parcelas previstas). */
export function buildCardPanels(input: {
  accounts: readonly FinancialAccount[];
  cards: readonly CreditCard[];
  statements: readonly CardStatement[];
  entries: readonly CardStatementEntry[];
  transactions: readonly TransactionContract[];
  installments: readonly CardInstallment[];
  /** Hoje (AAAA-MM-DD); parcelas previstas de faturas que já passaram são ignoradas. */
  today?: string;
}): CardPanel[] {
  const transactionsById = new Map(input.transactions.map(transaction => [transaction.id, transaction]));
  const installmentByTransaction = new Map(input.installments.filter(item => item.transactionId).map(item => [item.transactionId!, item]));
  return input.accounts.filter(account => account.type === 'credit_card').map(account => {
    const card = input.cards.find(item => item.accountId === account.id);
    if (!card) return { account, committedCents: 0n, tabs: [] };
    const tabs = new Map<string, StatementTab>();
    const tabFor = (competence: string) => tabs.get(competence) ?? tabs.set(competence, { competence, status: 'projected', purchasesCents: 0n, refundsCents: 0n,
      paymentsCents: 0n, openCents: 0n, projectedCents: 0n, lines: [] }).get(competence)!;
    for (const statement of input.statements.filter(item => item.cardId === card.id)) {
      const summary = cardStatementSummary(statement, input.entries, input.transactions);
      const tab = tabFor(statement.competence);
      Object.assign(tab, { statement, status: summary.status, purchasesCents: summary.purchasesCents, refundsCents: summary.refundsCents,
        paymentsCents: summary.paymentsCents, openCents: summary.openCents, settledManually: summary.settledManually });
      for (const entry of input.entries.filter(item => item.statementId === statement.id)) {
        const transaction = transactionsById.get(entry.transactionId)!;
        const installment = installmentByTransaction.get(transaction.id);
        tab.lines.push({ id: entry.id, description: transaction.description, date: transaction.eventDate, credit: entry.type !== 'purchase',
          detail: entry.type === 'purchase' && installment && installment.total > 1 ? 'Compra parcelada' : entryLabels[entry.type],
          amountCents: transaction.amountCents < 0n ? -transaction.amountCents : transaction.amountCents });
      }
    }
    const currentCompetence = input.today ? cardCompetence(input.today, card) : undefined;
    for (const installment of input.installments.filter(item => item.cardId === card.id && item.status === 'projected'
      && (!currentCompetence || item.dueCompetence >= currentCompetence))) {
      const tab = tabFor(installment.dueCompetence);
      tab.projectedCents += installment.amountCents;
      tab.lines.push({ id: installment.id, description: `${installment.description} ${installment.number}/${installment.total}`, detail: 'Parcela prevista',
        amountCents: installment.amountCents, credit: false });
    }
    const sorted = [...tabs.values()].sort((a, b) => a.competence.localeCompare(b.competence));
    const estimate = sorted.reduce((sum, tab) => sum + tab.openCents + tab.projectedCents, 0n);
    const fromBank = card.creditLimitCents !== undefined && card.availableLimitCents !== undefined;
    return { account, card, tabs: sorted, committedCents: fromBank ? card.creditLimitCents! - card.availableLimitCents! : estimate, limitSource: fromBank ? 'bank' : 'estimate' };
  });
}

/** Aba inicial: a fatura pendente mais antiga; sem pendência, a última materializada; senão a primeira prevista. */
export function defaultTab(tabs: readonly StatementTab[]): StatementTab | undefined {
  return tabs.find(tab => tab.statement && tab.openCents > 0n) ?? [...tabs].reverse().find(tab => tab.statement) ?? tabs[0];
}

/** Percentual com uma casa (`4,8%`) sem ponto flutuante no cálculo. */
export function limitShare(committedCents: bigint, limitCents: bigint): { label: string; basisPoints: number } {
  const permille = limitCents > 0n ? (committedCents * 1000n) / limitCents : 0n;
  return { label: `${permille / 10n},${permille % 10n}%`, basisPoints: Number(permille * 10n) };
}

export type BillTone = 'open' | 'closed' | 'overdue' | 'paid' | 'projected';
export type CardOverview = { panel: CardPanel; current?: StatementTab; currentCents: bigint; statusLabel: string; tone: BillTone; nextProjectedCents?: bigint;
  limitCents?: bigint; freeCents?: bigint; sortKey: string };

const daysBetween = (from: string, to: string) => Math.round((Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10)) - Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10))) / 86_400_000);
const inDays = (days: number, verb: string) => days === 0 ? `${verb} hoje` : `${verb} em ${days} ${days === 1 ? 'dia' : 'dias'}`;

/**
 * Resumo de um cartão para a visão geral (D-072): a fatura atual (a mesma aba que o detalhe abre), sua situação em
 * relação a hoje, limite usado/livre e a próxima fatura. `sortKey` põe primeiro quem vence antes; sem configuração, por último.
 */
export function cardOverview(panel: CardPanel, today: string): CardOverview {
  const current = defaultTab(panel.tabs);
  const limitCents = panel.card?.creditLimitCents;
  const limits = limitCents === undefined ? {} : { limitCents, freeCents: limitCents - panel.committedCents };
  const nextTab = current ? panel.tabs.find(tab => tab.competence > current.competence) : undefined;
  const next = nextTab ? { nextProjectedCents: nextTab.statement ? nextTab.openCents + nextTab.projectedCents : nextTab.projectedCents } : {};
  if (!panel.card) return { panel, currentCents: 0n, statusLabel: 'Configuração pendente', tone: 'projected', sortKey: '9' };
  if (!current) return { panel, currentCents: 0n, statusLabel: 'Sem fatura ainda', tone: 'projected', sortKey: '8', ...limits };
  const statement = current.statement;
  if (!statement) return { panel, current, currentCents: current.projectedCents, statusLabel: 'Prevista', tone: 'projected', sortKey: `5${current.competence}`, ...limits, ...next };
  const base = { panel, current, currentCents: current.status === 'paid' ? current.purchasesCents - current.refundsCents : current.openCents, ...limits, ...next };
  if (current.status === 'paid') return { ...base, statusLabel: 'Paga', tone: 'paid', sortKey: `4${statement.dueDate}` };
  if (today < statement.closingDate) return { ...base, statusLabel: `Aberta · ${inDays(daysBetween(today, statement.closingDate), 'fecha')}`, tone: 'open', sortKey: `2${statement.dueDate}` };
  if (today <= statement.dueDate) return { ...base, statusLabel: `Fechada · ${inDays(daysBetween(today, statement.dueDate), 'vence')}`, tone: 'closed', sortKey: `1${statement.dueDate}` };
  const late = daysBetween(statement.dueDate, today);
  return { ...base, statusLabel: `Vencida há ${late} ${late === 1 ? 'dia' : 'dias'}`, tone: 'overdue', sortKey: `0${statement.dueDate}` };
}
