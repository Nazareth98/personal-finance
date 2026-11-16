# Corporate UI v0.5 — Templates financeiros (Beta)

Os templates ficam em `apps/web/src/pages`: componentes de domínio compostos pela biblioteca `@personal-finance/ui`.

| Template | Conteúdo | Restrições |
| --- | --- | --- |
| Visão geral | Indicadores de contas, receitas/despesas, faturas e navegação para transações | Saldo bancário e resultado operacional **não** são a mesma métrica |
| Transações | `TransactionsDemo` com busca, filtros, paginação e ordenação | Sem persistência, aprovação ou edição bancária |
| Contas | Saldos de contas corrente, reserva e investimento | Valores ilustrativos; transferência própria não é receita |
| Cartões e faturas | Ciclo configurável, compras, estornos, pagamentos, status e parcelas futuras | Pagamento reduz saldo devido, **não cria nova despesa**; projeção não entra no realizado |
| Orçamentos | Limites, consumo, excedentes por categoria, progresso | Progresso visual limitado a 100%; excedente permanece textual |
| Caixinhas | Saldo, meta, aportes, resgates e progresso | Movimentos patrimoniais neutros e rastreáveis |
| Conexões | Instituições MeuPluggy, estado, tentativas, sucesso, erro e sincronização manual | Connect Token efêmero; nenhum secret ou dado bancário no modo demonstrativo |
| Revisão | Confiança, evidências, versão e confirmação de categoria | Correção explícita aprende alias sem alterar o lançamento importado |
| Relatórios | Realizado, renda recorrente e previsão de seis meses com metas, parcelas e aportes | Transferências e receitas extraordinárias ficam fora da média futura |

## Contrato técnico

- A navegação funciona por hash `#overview`, `#transactions`, `#accounts`, `#cards`, `#budgets`, `#savings`, `#connections`, `#review`, `#reports`. Há fallback para `overview`.
- Não depende de React Router nesta fase. O hash mantém navegação básica compartilhável e botão voltar/avançar.
- Light/Dark usa `data-theme` e tokens semânticos existentes.
- No shell autenticado, identidade, alternância Light/Dark por ícones e saída ficam no rodapé da sidebar; ações globais e contextuais ficam alinhadas ao cabeçalho do template, com “Nova movimentação” como ação primária.
- Composição: componentes genéricos em `packages/ui`; dados e regras de domínio demonstrativo em `apps/web/src/lib`; templates em `apps/web/src/pages`.
- No modo `test`, dados são **100% fictícios**, não enviados a API e não persistidos. No modo autenticado, os templates consomem os repositórios Supabase autorizados.
- O formulário de nova movimentação é demonstrativo no modo `test` e persistente no modo autenticado.
- Storybook contém os nove templates para revisão visual.
- Sidebar com indicador ativo lateral e ícone destacado; desktop permite recolher o menu para uma faixa de ícones, mantendo nomes acessíveis e navegação por teclado. A preferência de recolhimento vale durante a sessão da tela.
- No mobile, marca, tema e saída formam um cabeçalho compacto fixo durante a rolagem; navegação permanece em faixa horizontal rolável. Microinterações respeitam `prefers-reduced-motion`.

## Regras financeiras críticas

1. Valores monetários: `bigint` em centavos e formatação exata.
2. Receita, consumo e transferência própria são naturezas diferentes.
3. Pagamento de fatura é liquidação de obrigação; não contabilizar como novo consumo.
4. Saldo de contas é posição patrimonial em determinado instante, não resultado do mês.
5. Orçamento excedido preserva valor do excesso; barras visuais são apenas indicação.
6. Competência e data bancária podem diferir — nenhuma inferência de backend nesta demonstração.

## Critérios para v1 estável

Aprovação de interação com teclado/leitores de tela, revisão de contraste real, testes de navegadores, regressão visual, contratos completos no Figma e consumo por dados reais autorizados com autenticação. Antes disso, os templates seguem **Beta**.

## Complemento v0.5.1

Visão geral: gráfico comparativo de fluxo de caixa com alternância demonstrativa para ChartSkeleton. Relatórios: fluxo de caixa, evolução do resultado acumulado e rosca de despesas por categoria. Em tabelas, loading preserva a altura e as colunas por meio de TableSkeleton.

Valores exibidos e cores seguem `docs/design-system/CHARTS_AND_COLORS.md`. Não inferir que a série sintética representa histórico real.
