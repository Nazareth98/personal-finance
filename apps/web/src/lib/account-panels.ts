import { accountBalance, ledgerTotals, type FinancialAccount, type TransactionContract } from '@personal-finance/domain';
import { defaultTab, limitShare, type CardPanel } from './card-panels.ts';

export type AccountKind = 'checking' | 'reserve' | 'credit_card';
const kindOf = (type: FinancialAccount['type']): AccountKind => type === 'credit_card' ? 'credit_card' : type === 'checking' ? 'checking' : 'reserve';
const kindOrder: readonly AccountKind[] = ['checking', 'reserve', 'credit_card'];

export type AccountCardView = {
  account: FinancialAccount;
  balanceCents: bigint;
  /** Entradas e saídas da conta na competência, incluindo transferências: é o movimento do caixa. */
  inCents: bigint;
  outCents: bigint;
  lastEventDate?: string;
  /** Só cartões: fatura em aberto da aba padrão e limite comprometido. */
  bill?: { openCents: bigint; competence: string; dueDate?: string; limitCents?: bigint; limitLabel?: string; limitBasisPoints?: number };
};

export type AccountPanels = {
  availableCents: bigint;
  openBillsCents: bigint;
  /** Receitas e despesas do mês, sem transferências próprias (mesma regra do livro). */
  incomeCents: bigint;
  expenseCents: bigint;
  groups: { kind: AccountKind; items: AccountCardView[] }[];
};

export function buildAccountPanels({ accounts, transactions, cardPanels, month }: {
  accounts: readonly FinancialAccount[];
  transactions: readonly TransactionContract[];
  cardPanels: readonly CardPanel[];
  /** Competência `AAAA-MM` usada para entradas, saídas e totais do mês. */
  month: string;
}): AccountPanels {
  const panelByAccount = new Map(cardPanels.map(panel => [panel.account.id, panel]));
  const cards = accounts.map((account): AccountCardView => {
    const own = transactions.filter(row => row.accountId === account.id);
    const ofMonth = own.filter(row => row.competence === month);
    const view: AccountCardView = {
      account,
      balanceCents: accountBalance(account, transactions),
      inCents: ofMonth.reduce((total, row) => row.amountCents > 0n ? total + row.amountCents : total, 0n),
      outCents: ofMonth.reduce((total, row) => row.amountCents < 0n ? total - row.amountCents : total, 0n),
      lastEventDate: own.reduce<string | undefined>((latest, row) => !latest || row.eventDate > latest ? row.eventDate : latest, undefined)
    };
    const panel = panelByAccount.get(account.id);
    if (account.type === 'credit_card' && panel) {
      const tab = defaultTab(panel.tabs);
      const limitCents = panel.card?.creditLimitCents;
      const share = limitCents ? limitShare(panel.committedCents, limitCents) : undefined;
      view.bill = {
        openCents: tab?.openCents ?? 0n, competence: tab?.competence ?? month, dueDate: tab?.statement?.dueDate,
        limitCents, limitLabel: share?.label, limitBasisPoints: share?.basisPoints
      };
    }
    return view;
  });
  const totals = ledgerTotals(transactions.filter(row => row.competence === month));
  return {
    availableCents: cards.filter(card => card.account.type !== 'credit_card').reduce((total, card) => total + card.balanceCents, 0n),
    openBillsCents: cards.reduce((total, card) => total + (card.bill?.openCents ?? 0n), 0n),
    incomeCents: totals.incomeCents,
    expenseCents: totals.expenseCents,
    groups: kindOrder
      .map(kind => ({ kind, items: cards.filter(card => kindOf(card.account.type) === kind).sort((a, b) => a.account.name.localeCompare(b.account.name, 'pt-BR')) }))
      .filter(group => group.items.length > 0)
  };
}
