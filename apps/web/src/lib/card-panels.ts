import { cardStatementSummary, type CardInstallment, type CardStatement, type CardStatementEntry, type CreditCard, type FinancialAccount, type TransactionContract } from '@personal-finance/domain';

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
};
export type CardPanel = { account: FinancialAccount; card?: CreditCard; committedCents: bigint; tabs: StatementTab[] };

const entryLabels = { purchase: 'Compra', refund: 'Estorno', payment: 'Pagamento' } as const;

/** Um painel por conta de cartão; cada competência vira uma aba (fatura materializada e/ou parcelas previstas). */
export function buildCardPanels(input: {
  accounts: readonly FinancialAccount[];
  cards: readonly CreditCard[];
  statements: readonly CardStatement[];
  entries: readonly CardStatementEntry[];
  transactions: readonly TransactionContract[];
  installments: readonly CardInstallment[];
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
        paymentsCents: summary.paymentsCents, openCents: summary.openCents });
      for (const entry of input.entries.filter(item => item.statementId === statement.id)) {
        const transaction = transactionsById.get(entry.transactionId)!;
        const installment = installmentByTransaction.get(transaction.id);
        tab.lines.push({ id: entry.id, description: transaction.description, date: transaction.eventDate, credit: entry.type !== 'purchase',
          detail: entry.type === 'purchase' && installment && installment.total > 1 ? 'Compra parcelada' : entryLabels[entry.type],
          amountCents: transaction.amountCents < 0n ? -transaction.amountCents : transaction.amountCents });
      }
    }
    for (const installment of input.installments.filter(item => item.cardId === card.id && item.status === 'projected')) {
      const tab = tabFor(installment.dueCompetence);
      tab.projectedCents += installment.amountCents;
      tab.lines.push({ id: installment.id, description: `${installment.description} ${installment.number}/${installment.total}`, detail: 'Parcela prevista',
        amountCents: installment.amountCents, credit: false });
    }
    const sorted = [...tabs.values()].sort((a, b) => a.competence.localeCompare(b.competence));
    return { account, card, tabs: sorted, committedCents: sorted.reduce((sum, tab) => sum + tab.openCents + tab.projectedCents, 0n) };
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
