# Corporate UI — componentes v0.4 Beta

## Catálogo

- **Foundations**: tokens Light/Dark, tipografia, espaçamento, raios e contraste.
- **Primitives**: Button, Card, Badge.
- **Forms**: Input, Select, Checkbox, RadioGroup, Field, FormMessage, Dialog, Toast.
- **Data Display**: DataTable, Pagination, EmptyState, Skeleton, MetricCard.
- **Patterns**: busca, filtros, tabelas, ordenação, paginação, estados vazios e loading.
- **Templates v0.5**: contas, transações, orçamento, cartão/fatura e relatórios.

Consulte [Forms](FORMS.md), [Data Display](DATA_DISPLAY.md) e [Governança](GOVERNANCE.md).

## Contratos compartilhados

Componentes exportados em `packages/ui/src/index.ts`, props TypeScript, tokens semânticos Light/Dark, labels e estados acessíveis. Domínio financeiro permanece no app consumidor; componentes genéricos não calculam saldos.

**Status: Beta.** Exige testes de interação em navegador, revisão visual de estados e auditoria de acessibilidade antes de Stable.
