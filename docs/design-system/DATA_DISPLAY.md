# Corporate UI — Data Display v0.4 Beta

## Componentes

| Componente | Parâmetros | Contrato |
| --- | --- | --- |
| `DataTable<T>` | `ariaLabel`, `columns`, `rows`, `getRowKey`, `sort`, `onSortChange` | Tabela HTML semântica, cabeçalhos clicáveis por teclado, `aria-sort`, região navegável com rolagem horizontal |
| `Pagination` | `page`, `pageSize`, `totalItems`, `onPageChange` | Navegação anterior/próxima desabilitada nos limites; status de resultados |
| `MetricCard` | `label`, `value`, `tone`, `supportingText` | KPI com números tabulares e textos semânticos |
| `EmptyState` | `title`, `description`, `action`, `icon` | Estado vazio com texto e ação opcional |
| `Skeleton` | `width`, `height` | Placeholder `aria-hidden` e animação desligável via `prefers-reduced-motion` |
| `sortRows` | linhas, ordenação, colunas | Ordenação estável, suporta `bigint` sem perda de precisão |
| `paginateRows` | linhas, página, tamanho | Fatia os resultados, sem mutar o conjunto original |

## Regra de filtros

A interface consumidora aplica filtros **antes** de ordenar e paginar. O filtro deve atualizar a página para 1. A tabela é agnóstica ao domínio e os dados devem possuir chaves estáveis.

O exemplo financeiro em `apps/web/src/components/TransactionsDemo.tsx` implementa:
1. Busca textual insensível a maiúsculas e acentos.
2. Filtro por tipo: receitas, despesas, transferências e todos.
3. Filtro por categoria.
4. Ordenação de colunas por cabeçalhos.
5. Paginação de cinco registros por página.
6. Indicadores recalculados sobre dados filtrados, **excluindo transferências próprias dos totais de receita e consumo**.
7. Estado vazio e carregamento demonstrativos.

## Precisão financeira

- Valores de exemplo são magnitudes `bigint` em centavos.
- Formatação BRL extrai reais e centavos sem converter montantes para `number`.
- Testes exercitam valores maiores que `Number.MAX_SAFE_INTEGER`.
- Transferência própria possui categoria semântica `transfer`, distinta de receita e despesa.
- A demo é somente memória local e **não persiste dados**.

## Acessibilidade

- Cabeçalhos `th scope="col"` e `aria-sort` para ordenação.
- Labels explícitos nos filtros, paginação com `nav` nomeado e status acessível.
- Rolagem horizontal na região da tabela quando necessário, evitando corte de colunas.
- Não depender exclusivamente da cor para sinal financeiro: tabela apresenta sinal e categoria textual.
- Sem animação obrigatória para usuários com movimento reduzido.

## Limites Beta

Ainda precisamos de testes de teclado e leitores de tela em navegador real, regressão visual, integração com o backend, paginação remota, filtros persistidos em URL, estados de erro reais e componentes equivalentes completos no Figma. Não confundir stories com certificação WCAG completa.
