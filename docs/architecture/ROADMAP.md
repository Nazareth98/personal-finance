# Roadmap — Corporate UI para Personal Finance

| Marco | Escopo | Situação |
| --- | --- | --- |
| v0.1 Foundations | Tokens Light/Dark, Button, Card, Badge e dashboard fictício | Entregue |
| v0.2 Qualidade | Validação de tokens, contraste, Input, Storybook, CI e governança | Entregue |
| v0.3 Formulários | Select, Checkbox, RadioGroup, Field, FormMessage, Dialog, Toast, loading e exemplo validado | Entregue — Beta |
| v0.4 Dados | DataTable, filtros, paginação, EmptyState, Skeleton e MetricCard | Próxima etapa |
| v0.5 Templates | Layouts de contas, transações, orçamento e faturas | Planejado |
| v0.6 Integração | Testes de UI, auditoria axe, regressão visual, Figma/Code Connect | Planejado |
| v1.0 Estável | Revisão WCAG, API pública, documentação e releases | Critérios pendentes |

## Decisões e limites

- Mesma base de código para biblioteca UI e aplicação consumidoras.
- `packages/tokens/src/themes.json` é a fonte técnica da paleta; Figma é a referência visual.
- Formulários da v0.3 são demonstrativos e não persistem transações.
- Fluxos financeiros reais exigirão backend, autorização, validação de servidor, controle de concorrência e regras de domínio.
- Não colocar dados pessoais ou bancários reais em exemplos, repositório ou Stories.
