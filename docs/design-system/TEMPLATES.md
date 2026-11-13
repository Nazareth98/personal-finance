# Corporate UI v0.5 — Templates financeiros (Beta)

Os templates ficam em `apps/web/src/pages`: componentes de domínio compostos pela biblioteca `@personal-finance/ui`.

| Template | Conteúdo | Restrições |
| --- | --- | --- |
| Visão geral | Indicadores de contas, receitas/despesas, faturas e navegação para transações | Saldo bancário e resultado operacional **não** são a mesma métrica |
| Transações | `TransactionsDemo` com busca, filtros, paginação e ordenação | Sem persistência, aprovação ou edição bancária |
| Contas | Saldos de contas corrente, reserva e investimento | Valores ilustrativos; transferência própria não é receita |
| Cartões e faturas | Compras declaradas, pagamentos, status e pendências | Pagamento reduz saldo devido, **não cria nova despesa** |
| Orçamentos | Limites, consumo, excedentes por categoria, progresso | Progresso visual limitado a 100%; excedente permanece textual |
| Relatórios | Resultado sintético e despesas por categoria | `bigint` para todos os totais; porcentagem é somente visual |

## Contrato técnico

- A navegação funciona por hash `#overview`, `#transactions`, `#accounts`, `#cards`, `#budgets`, `#reports`. Há fallback para `overview`.
- Não depende de React Router nesta fase. O hash mantém navegação básica compartilhável e botão voltar/avançar.
- Light/Dark usa `data-theme` e tokens semânticos existentes.
- Composição: componentes genéricos em `packages/ui`; dados e regras de domínio demonstrativo em `apps/web/src/lib`; templates em `apps/web/src/pages`.
- Dados são **100% fictícios**, não enviados a API e não persistidos.
- O formulário de nova movimentação permanece demonstração sem armazenamento.
- Storybook contém os seis templates para revisão visual.
- Respeitar responsividade; navegação vertical em desktop e faixa rolável no mobile.

## Regras financeiras críticas

1. Valores monetários: `bigint` em centavos e formatação exata.
2. Receita, consumo e transferência própria são naturezas diferentes.
3. Pagamento de fatura é liquidação de obrigação; não contabilizar como novo consumo.
4. Saldo de contas é posição patrimonial em determinado instante, não resultado do mês.
5. Orçamento excedido preserva valor do excesso; barras visuais são apenas indicação.
6. Competência e data bancária podem diferir — nenhuma inferência de backend nesta demonstração.

## Critérios para v1 estável

Aprovação de interação com teclado/leitores de tela, revisão de contraste real, testes de navegadores, regressão visual, contratos completos no Figma e consumo por dados reais autorizados com autenticação. Antes disso, os templates seguem **Beta**.
