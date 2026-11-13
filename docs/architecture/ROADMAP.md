# Roadmap — Corporate UI para Personal Finance

| Marco | Escopo | Situação |
| --- | --- | --- |
| v0.1 Foundations | Tokens Light/Dark, Button, Card, Badge | Entregue |
| v0.2 Qualidade | Contraste, Storybook, CI, Input | Entregue |
| v0.3 Forms | Select, Checkbox, Radio, Dialog, Toast e demo | Entregue — Beta |
| v0.4 Data Display | DataTable, filtros, paginação, EmptyState, Skeleton, MetricCard | Entregue — Beta |
| v0.5 Templates | Visão geral, contas, transações, cartões/faturas, orçamentos e relatórios | Entregue — Beta |
| v0.5.1 Cores, gráficos e loading | Tokens positivos/negativos, 3 gráficos reutilizáveis, skeletons estruturais | Entregue — Beta |
| v0.5.2 Consolidação Light/Dark | Preferência Automático/Light/Dark, tokens e contraste, preview simultânea | Entregue — Beta |
| v0.6 Integração | Testes navegador, axe, regressão visual, Figma/Code Connect | Próxima etapa |
| v1.0 Estável | API consolidada, revisão WCAG, integração controlada e releases | Pendente |

## Decisões e limites

- Templates utilizam apenas dados inventados e não tocam bancos, autenticação ou Open Finance.
- A UI é composta de biblioteca de componentes genéricos e templates financeiros em `apps/web`.
- Testes comprovam contratos de cálculo dos dados de demonstração; não substituem testes de segurança ou integração reais.
- Os valores de faturas não são automaticamente somados ao consumo; pagamento é liquidação patrimonial.
- Figma é a referência visual e JSON versionado é fonte de verdade dos tokens.
