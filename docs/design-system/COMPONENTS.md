# Corporate UI — contrato de componentes (v0.2)

## Taxonomia

- **Foundations**: cores semânticas, tipografia, espaços, raios, alturas e contraste.
- **Primitives**: Button, Input, Badge, Card, Select, Checkbox, Dialog, Tooltip, Tabs.
- **Data display**: DataTable, EmptyState, Skeleton, MetricCard, Progress, ChartLegend.
- **Patterns**: filtros, formulários de lançamento, confirmação destrutiva, drawer, painel de análise e revisão de importações.
- **Templates financeiros**: visão geral, transações, contas, cartões/faturas, orçamentos e relatórios.

## Regras de API

| Parâmetro | Regra |
| --- | --- |
| Nome de componente | PascalCase; exportações explícitas em `packages/ui/src/index.ts` |
| Props | TypeScript público, nativas HTML quando possível |
| Estados | Default, Hover, Focus-visible, Disabled, Error e Loading quando aplicável |
| Variantes | Semânticas e limitadas; não duplicar componente por tema |
| Tema | Usar tokens CSS `--color-*` e `--spacing-*` |
| Acessibilidade | Controle com label, teclado, foco visível e papel semântico |
| Responsividade | Mobile mínimo 320px; sem rolagem horizontal da página |
| Dados financeiros | `pt-BR` e BRL; valores monetários não são tipos `number` em regras de domínio |
| Status | Receita, despesa e transferência precisam de texto; cor é secundária |

## Primeira família implementada

- `Button`: variantes primary, secondary, ghost e danger; alturas sm/md/lg.
- `Card`: superfície semântica e borda, suporte a conteúdo arbitrário.
- `Badge`: tons neutral/income/expense/transfer.
- `Input`: label obrigatório, hint, error e estados disabled/focus. Erro vinculado via `aria-describedby`.

Os componentes são demonstráveis em Storybook: `pnpm storybook`. Exemplos nunca devem incorporar informações financeiras de pessoas reais.

## Critérios para promover um componente a "Stable"

1. Contrato tipado, sem cores hard-coded.
2. Stories com variantes e estados (incluindo Dark).
3. Verificação de teclado, foco e labels; contrastes relevantes WCAG AA.
4. Unit/integration tests para interações relevantes.
5. Documentação de propósito e restrições.
6. Review de API e regressão visual antes de release.

Atualmente **Button, Card, Badge e Input estão em status Beta**, até concluirmos os testes de interação, varredura automatizada de acessibilidade e baseline visual.
