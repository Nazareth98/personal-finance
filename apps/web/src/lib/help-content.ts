// D-067: textos de ajuda por tela, glossário e primeiros passos. Fonte única; `**negrito**` vira <strong>.
import type { PageId } from '../DashboardApp';

export type ScreenHelp = { title: string; subtitle: string; shows: string; calc: string[]; actions: string[]; terms: string[] };

/** O glossário é a própria ajuda; não tem painel. */
export type HelpPageId = Exclude<PageId, 'glossary'>;

export const screenHelp: Record<HelpPageId, ScreenHelp> = {
  overview: {
    title: "Visão geral", subtitle: "O mês num relance.",
    shows: "O resultado do mês: quanto entrou, quanto saiu, faturas a pagar, metas em alerta e a evolução nos últimos meses.",
    calc: ["**Resultado** = receitas − despesas do mês.", "Transferências entre suas contas, pagamentos de fatura, aportes e resgates **não contam** como receita ou gasto.", "Compras no cartão entram no mês do **vencimento** da fatura.", "Nos gráficos, toque num mês para ver os valores daquele período."],
    actions: ["Trocar o mês no seletor de período.", "Tocar num alerta para ir direto à tela que resolve.", "Usar o botão **+** para registrar uma movimentação manual."],
    terms: ["Competência", "Resultado", "Natureza"]
  },
  transactions: {
    title: "Transações", subtitle: "Todos os lançamentos, importados e manuais.",
    shows: "A lista completa de lançamentos de todas as contas e cartões, com busca, filtros e totais do que está filtrado.",
    calc: ["Os totais no topo somam só o que passa nos filtros.", "Lançamento importado do banco não é alterado: correções viram ajustes ou revisões.", "“Por página” fica salvo neste aparelho."],
    actions: ["Buscar por descrição ou valor e filtrar por período, conta, categoria ou natureza.", "Tocar num lançamento para ver detalhes ou corrigir a categoria.", "**+ Nova movimentação** para algo que o banco não trouxe, como dinheiro em espécie."],
    terms: ["Natureza", "Ajuste", "Competência"]
  },
  accounts: {
    title: "Contas", subtitle: "Saldo de cada conta.",
    shows: "Suas contas e cartões com saldo atual, movimento do mês e o banco de origem.",
    calc: ["**Saldo** = saldo inicial + tudo que entrou − tudo que saiu.", "Contas conectadas mostram a logo do banco; manuais, o ícone do tipo."],
    actions: ["Editar nome e saldo inicial.", "Arquivar uma conta que não usa mais: o histórico continua.", "Criar uma conta manual, como carteira."],
    terms: ["Ajuste", "Natureza"]
  },
  cards: {
    title: "Cartões", subtitle: "Faturas, limite e parcelas.",
    shows: "Todos os cartões num relance: fatura atual e a situação dela, limite usado e livre e a próxima fatura prevista. Toque num cartão para ver as faturas, os lançamentos e as parcelas que ainda vão cair.",
    calc: ["As compras de um cartão só entram depois que ele tem **dia de fechamento e de vencimento**. Sem isso o app não sabe em que fatura cada compra cai; ao salvar, ele busca as compras no banco.", "A fatura leva o mês do **vencimento**: compras de 09/09 a 08/10 vencem em 15/10.", "**Pendente** = compras − estornos − pagamentos ligados.", "A linha “Total da fatura anterior” do banco é só informativa e não conta.", "Parcelas futuras aparecem como previstas até o banco trazer o lançamento."],
    actions: ["**Vincular pagamento** quando o débito na conta não foi ligado sozinho.", "Configurar dia de fechamento, vencimento e limite.", "Abrir “Lançamentos” para ver as compras da fatura."],
    terms: ["Fatura", "Pagamento de fatura", "Competência"]
  },
  budgets: {
    title: "Orçamentos", subtitle: "Tetos mensais por categoria.",
    shows: "Quanto você gastou em cada categoria no mês, comparado ao teto que você definiu.",
    calc: ["**Teto** é um valor fixo por mês. Na visão do ano, vale 12 vezes.", "**Folga** = teto − gasto. Negativa vira excedente.", "**Perto do teto** a partir de 80% usado.", "Compras no cartão contam no mês do vencimento da fatura."],
    actions: ["**+ Definir meta** para uma categoria.", "Tocar num card para **editar ou excluir** a meta.", "Em **Gastos sem meta**, criar uma meta a partir do que já foi gasto."],
    terms: ["Teto", "Folga", "Competência", "Gastos sem meta"]
  },
  savings: {
    title: "Caixinhas", subtitle: "Reservas com saldo próprio.",
    shows: "Cada reserva com saldo, objetivo, prazo e quanto guardar por mês para chegar lá.",
    calc: ["**Saldo** = saldo inicial + aportes − resgates.", "Aporte e resgate **não são** receita nem gasto: o dinheiro só muda de lugar.", "O plano mensal divide o que falta pelo número de meses até a data-alvo."],
    actions: ["Criar, editar ou arquivar uma caixinha.", "Registrar um aporte ou resgate.", "Ligar um lançamento do banco a uma caixinha quando o app não reconheceu."],
    terms: ["Caixinha", "Aporte e resgate"]
  },
  categories: {
    title: "Categorias", subtitle: "Como os gastos e receitas são agrupados.",
    shows: "As categorias do app e as suas, com ícone, cor e quanto foram usadas.",
    calc: ["Categorias do sistema são protegidas: não dá para excluir.", "Cada categoria vale para receita ou para despesa, não para as duas.", "Categoria com histórico é arquivada, não apagada."],
    actions: ["Criar categoria com nome, ícone e cor.", "Reordenar, editar ou arquivar.", "Ao arquivar, escolher para qual categoria os lançamentos vão."],
    terms: ["Natureza"]
  },
  connections: {
    title: "Conexões", subtitle: "Bancos ligados pelo MeuPluggy.",
    shows: "Cada banco conectado, quando o banco atualizou os dados, a última importação e qualquer erro.",
    calc: ["O app importa ao abrir, se a última tentativa tiver mais de 6 horas.", "“Sincronizar agora” busca o dado mais recente que o banco já entregou ao Pluggy; não força o banco a atualizar.", "Importar de novo não duplica lançamentos."],
    actions: ["**Conectar ao Pluggy** com suas chaves (primeira vez).", "**Conectar instituição** para cada banco do MeuPluggy.", "Sincronizar agora ou ver o erro de uma conexão."],
    terms: ["Reconciliado"]
  },
  review: {
    title: "Revisão", subtitle: "O que o app não conseguiu decidir sozinho.",
    shows: "A fila de lançamentos que precisam de você: categoria a confirmar ou efeito financeiro a definir, como pagamento de fatura ou aporte em caixinha.",
    calc: ["Sugestão com confiança alta já entra sozinha; média vem para cá; baixa fica sem categoria.", "Pagamento de fatura e transferência entre suas contas precisam do outro lado ligado.", "Cada confirmação ensina o app para os próximos lançamentos parecidos."],
    actions: ["**Confirmar** a sugestão com um toque.", "**Alterar** para escolher outra categoria ou natureza.", "Confirmar a mesma categoria em **todos os lançamentos iguais** de uma vez.", "Ver o histórico do que já foi decidido."],
    terms: ["Revisão", "Natureza", "Reconciliado"]
  },
  reports: {
    title: "Relatórios", subtitle: "Tendência e previsão.",
    shows: "Receitas e despesas mês a mês, de onde vem o resultado e uma previsão para os próximos seis meses.",
    calc: ["A previsão usa a média dos **últimos seis meses** de receitas recorrentes.", "Receitas extraordinárias entram no realizado, mas não na média.", "O gasto previsto usa o maior entre a média recorrente e a soma dos tetos, mais parcelas futuras."],
    actions: ["Alternar entre visão mensal e anual.", "Tocar num mês do gráfico para ver os valores.", "Conferir a previsão antes de criar metas."],
    terms: ["Teto", "Competência"]
  }
};

export type GlossaryTerm = { term: string; definition: string };

export const glossary: GlossaryTerm[] = [
  { term: "Ajuste", definition: "Lançamento que corrige diferença ou erro sem mudar o que veio do banco. A linha “Total da fatura anterior” do cartão também é ajuste: não conta como gasto." },
  { term: "Aporte e resgate", definition: "Aporte guarda dinheiro numa caixinha; resgate tira. O dinheiro só muda de lugar: nenhum dos dois é receita ou despesa." },
  { term: "Caixinha", definition: "Reserva com saldo próprio, objetivo e prazo." },
  { term: "Competência", definition: "O mês a que um valor pertence. Na conta, a data do lançamento; no cartão, o mês do vencimento da fatura." },
  { term: "Fatura", definition: "Conjunto das compras do cartão entre dois fechamentos. Leva o mês do vencimento: compras de 09/09 a 08/10 vencem em 15/10." },
  { term: "Folga", definition: "Quanto ainda cabe no teto do mês. Negativa vira excedente." },
  { term: "Gastos sem meta", definition: "Despesas do mês em categorias que ainda não têm teto. Dá para criar a meta direto dali." },
  { term: "Natureza", definition: "O efeito do lançamento: receita, despesa, transferência entre suas contas, pagamento de fatura, aporte, resgate ou ajuste." },
  { term: "Pagamento de fatura", definition: "Quita o cartão. Não é gasto novo: as compras já contaram na fatura." },
  { term: "Reconciliado", definition: "Quando o lado da conta e o lado do cartão (ou das duas contas) foram ligados e batem." },
  { term: "Resultado", definition: "Receitas menos despesas do mês. Transferências, pagamentos de fatura, aportes e resgates ficam de fora." },
  { term: "Revisão", definition: "Fila do que o app não conseguiu decidir sozinho: categoria ou natureza para confirmar." },
  { term: "Teto", definition: "Valor máximo que você aceita gastar por mês numa categoria." }
];

/** Âncora estável de um termo (para `#glossary?termo=…`). */
export function termSlug(term: string): string {
  return term.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Divide `**negrito**` em partes para renderizar sem HTML cru. */
export function richParts(text: string): { text: string; strong: boolean }[] {
  return text.split('**').map((part, index) => ({ text: part, strong: index % 2 === 1 })).filter(part => part.text);
}

/** D-067: o que cada escolha de natureza quer dizer, mostrado abaixo do campo enquanto a pessoa decide. */
export const natureHints: Record<string, string> = {
  income: 'Dinheiro que entrou e é seu: salário, venda, reembolso.',
  expense: 'Dinheiro gasto com algo: compra, conta, serviço.',
  own_transfer: 'Você só moveu dinheiro entre suas próprias contas. Não é receita nem gasto.',
  card_payment: 'Você pagou a fatura do cartão. As compras já contaram na fatura, então isto não é gasto de novo.',
  savings_contribution: 'Você guardou dinheiro numa caixinha. Não é gasto: o dinheiro continua seu.',
  savings_withdrawal: 'Você tirou dinheiro de uma caixinha. Não é receita: o dinheiro já era seu.',
  adjustment: 'Corrige uma diferença sem mudar o que veio do banco.',
  transfer: 'Você só moveu dinheiro entre suas próprias contas. Não é receita nem gasto.',
  adjustment_expense: 'Corrige um gasto que ficou registrado a mais ou a menos.',
  adjustment_income: 'Corrige uma receita que ficou registrada a mais ou a menos.'
};
