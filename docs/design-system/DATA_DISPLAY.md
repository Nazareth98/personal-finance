# Corporate UI v0.4 — Componentes de dados (Beta)

Componentes genéricos no pacote `@personal-finance/ui`: `DataTable<T>`, `Pagination`, `MetricCard`, `EmptyState` e `Skeleton`. Suas histórias são consultáveis em Storybook em **Data/**.

## Parâmetros e acessibilidade

- `DataTable`: `columns`, `rows`, `getRowKey`, `ariaLabel`; opcionalmente `sort`, `onSortChange`, `headerIcon` e `iconTone`; `th scope="col"`, `aria-sort` e região de rolagem navegável. O ícone identifica a entidade da coluna principal e nunca substitui seu rótulo textual.
- `Pagination`: `page`, `pageSize`, `totalItems` e `onPageChange`; desativa navegação além dos limites.
- `MetricCard`: título, valor, suporte, ícone e tom semântico; quando nenhum ícone é informado, receita, despesa e transferência recebem o símbolo correspondente ao tom. Não realiza cálculos financeiros.
- `EmptyState`: título, descrição e ação opcional.
- `Skeleton`: placeholder sem conteúdo acessível e animação removida por `prefers-reduced-motion`.
- `sortRows` e `paginateRows`: utilitários puros, sem mutação dos arrays; ordenação exata de `bigint`.

## Padrão para tabelas financeiras

Filtro → ordenação → paginação. Identificadores de registros devem ser estáveis. A interface consumidora deve recalcular indicadores com base no conjunto filtrado, sem usar `number` para quantias monetárias.

O exemplo em `TransactionsDemo` contém filtros, ordenação, cinco registros por página, estado vazio e carregamento. Transferências internas não entram nos totais de renda/consumo. **Todos os dados são inventados**.

Ícones e cores semânticas reforçam a leitura de cards e entidades financeiras, mas nunca são o único sinal: texto, sinal monetário e rótulos permanecem obrigatórios.

Limites Beta: faltam testes reais de leitores de tela/navegadores, regressão visual e integração de API com paginação remota.

## Datas e competências

Use os formatadores de `apps/web/src/lib/demo-transactions.ts`; não formate datas inline.

| Tipo | Exemplo | Formatador |
| --- | --- | --- |
| data bancária (`yyyy-MM-dd`) | `05/11/2026` | `formatLocalDate`, sem `Date`, para não deslocar o dia |
| competência (`yyyy-MM`) | `nov/2026` | `formatCompetence` |
| instante operacional (timestamp) | `18/11/2026, 10:30` | `formatDateTime`, no fuso do navegador |

## Ordenação, busca e filtros

- Toda coluna de dados declara `sortable` e `sortValue` (data ISO, dinheiro em `bigint`, percentual em pontos-base, texto comparado em pt-BR); colunas de ação não ordenam.
- Sem `onSortChange`, o `DataTable` ordena sozinho. Tabelas paginadas controlam `sort` e ordenam antes de paginar.
- Filtros de tela vivem na URL (`#pagina?chave=valor`) via `useHashParams`, que usa `replaceState` e não polui o histórico.
- Transações e Revisão compartilham `TransactionFilterFields`: busca por descrição sem acentos e maiúsculas, conta, categoria, natureza, contagem e “Limpar filtros”.
