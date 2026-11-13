# Corporate UI v0.4 — Componentes de dados (Beta)

Componentes genéricos no pacote `@personal-finance/ui`: `DataTable<T>`, `Pagination`, `MetricCard`, `EmptyState` e `Skeleton`. Suas histórias são consultáveis em Storybook em **Data/**.

## Parâmetros e acessibilidade

- `DataTable`: `columns`, `rows`, `getRowKey`, `ariaLabel`; opcionalmente `sort` e `onSortChange`; `th scope="col"`, `aria-sort` e região de rolagem navegável.
- `Pagination`: `page`, `pageSize`, `totalItems` e `onPageChange`; desativa navegação além dos limites.
- `MetricCard`: título, valor, suporte e tom semântico; não realiza cálculos financeiros.
- `EmptyState`: título, descrição e ação opcional.
- `Skeleton`: placeholder sem conteúdo acessível e animação removida por `prefers-reduced-motion`.
- `sortRows` e `paginateRows`: utilitários puros, sem mutação dos arrays; ordenação exata de `bigint`.

## Padrão para tabelas financeiras

Filtro → ordenação → paginação. Identificadores de registros devem ser estáveis. A interface consumidora deve recalcular indicadores com base no conjunto filtrado, sem usar `number` para quantias monetárias.

O exemplo em `TransactionsDemo` contém filtros, ordenação, cinco registros por página, estado vazio e carregamento. Transferências internas não entram nos totais de renda/consumo. **Todos os dados são inventados**.

Limites Beta: faltam testes reais de leitores de tela/navegadores, regressão visual e integração de API com paginação remota.
