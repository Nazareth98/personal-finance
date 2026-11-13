# Roadmap — Corporate UI para Personal Finance

| Marco | Escopo | Situação |
| --- | --- | --- |
| v0.1 Foundations | Tokens Light/Dark, Button, Card, Badge e dashboard sintético | Entregue |
| v0.2 Qualidade | Validação de tokens, contraste, Input, Storybook, CI e governança | Implementação em PR |
| v0.3 Formulários | Select, Checkbox, Radio, Field, FormMessage, Dialog, Toast | Planejado |
| v0.4 Dados | DataTable, filtros, paginação, EmptyState, Skeleton e MetricCard | Planejado |
| v0.5 Templates | Layouts de contas, transações, orçamento e faturas; responsividade | Planejado |
| v0.6 Integração | Testes de UI, auditoria axe, regressão visual, Figma/Code Connect | Planejado |
| v1.0 Estável | Revisão WCAG, API pública de componentes, documentação e releases | Critérios pendentes |

## Dependências e limites

- Design System permanece no mesmo repositório; extrair para package independente somente após uso por dois consumidores reais.
- Codex segue `AGENTS.md`; implementar novas telas a partir dos componentes e tokens.
- A sincronização Figma ↔ GitHub ainda é manual, explicitada em `docs/design-system/FIGMA.md`.
- Backend financeiro, dados, autenticação e importação não fazem parte destes marcos de UI.
- Valores reais nunca são usados em exemplos.
