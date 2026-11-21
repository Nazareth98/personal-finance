import type { LedgerData } from '../ledger/contracts';
import type { ConnectionsData } from '../integrations/contracts';

/** D-067: “Primeiros passos”. Cada passo se marca sozinho a partir dos dados; nenhum estado extra no banco. */
export type FirstStepId = 'pluggy' | 'holder' | 'banks' | 'review' | 'cards' | 'savings' | 'budgets';
export type FirstStep = { id: FirstStepId; title: string; description: string; href: string; cta: string; done: boolean };

export function buildFirstSteps(ledger: LedgerData, connections: ConnectionsData, pendingReviews: number): FirstStep[] {
  const hasBanks = connections.connections.length > 0;
  const cardAccounts = ledger.accounts.filter(account => account.type === 'credit_card');
  const configured = new Set(ledger.creditCards.map(card => card.accountId));
  return [
    { id: 'pluggy', title: 'Conectar ao Pluggy', description: 'Informe as chaves do painel do Pluggy. O card em Conexões explica onde encontrá-las.',
      href: '#connections', cta: 'Abrir Conexões', done: Boolean(connections.credentials?.configured) || hasBanks },
    { id: 'holder', title: 'Informar seu nome', description: 'O nome que aparece no banco. Serve para reconhecer Pix entre as suas próprias contas.',
      href: '#overview', cta: 'Informar nome', done: Boolean(ledger.holderName) },
    { id: 'banks', title: 'Conectar seus bancos', description: 'Em Conexões, toque em “Conectar instituição” e autorize cada banco do MeuPluggy.',
      href: '#connections', cta: 'Conectar banco', done: hasBanks },
    { id: 'review', title: 'Revisar os lançamentos', description: 'Confirme categorias e pagamentos de fatura que o app não conseguiu decidir sozinho.',
      href: '#review', cta: 'Abrir Revisão', done: ledger.transactions.length > 0 && pendingReviews === 0 },
    { id: 'cards', title: 'Conferir os cartões', description: 'Dia de fechamento e de vencimento de cada cartão, para a fatura cair no mês certo.',
      href: '#cards', cta: 'Abrir Cartões', done: cardAccounts.length > 0 && cardAccounts.every(account => configured.has(account.id)) },
    { id: 'savings', title: 'Criar caixinhas', description: 'Reservas com saldo, objetivo e prazo. Aportes e resgates não contam como gasto.',
      href: '#savings', cta: 'Abrir Caixinhas', done: ledger.savingsBoxes.length > 0 },
    { id: 'budgets', title: 'Definir metas', description: 'Um teto mensal em reais para as categorias que você quer acompanhar.',
      href: '#budgets', cta: 'Abrir Orçamentos', done: ledger.budgets.length > 0 }
  ];
}
