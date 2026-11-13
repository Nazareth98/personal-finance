# Corporate UI — contrato de componentes (v0.3)

## Taxonomia

- **Foundations**: cores, tipografia, espaçamento, raios, alturas e contraste.
- **Primitives**: Button, Card, Badge.
- **Forms**: Input, Select, Checkbox, RadioGroup, Field, FormMessage, Dialog, ToastProvider/useToast.
- **Data display (próxima etapa)**: DataTable, EmptyState, Skeleton, MetricCard, Progress, ChartLegend.
- **Patterns**: filtros, validação e confirmação de ações, formulários de lançamento, revisão de importações.
- **Templates financeiros**: visão geral, transações, contas, cartões/faturas, orçamentos e relatórios.

Todos os componentes estão em **Beta** até a execução de testes de interação, análise de acessibilidade abrangente e baseline de regressão visual.

## Contratos

| Item | Regra |
| --- | --- |
| Exportação | TypeScript, PascalCase, `packages/ui/src/index.ts` |
| Temas | Mesmos tokens Light/Dark sem duplicação de componentes |
| Acessibilidade | Labels, teclado, foco e feedback programático |
| Responsividade | Layout fluido, inclusive mobile |
| Estados | Default, Focus, Disabled, Error e Loading quando aplicável |
| Finanças | Valores em centavos, semântica textual de receita/despesa/transferência |
| Documentação | Stories, props tipadas, restrições de uso e exemplos fictícios |

Ver [documentação de formulários](FORMS.md) e [governança](GOVERNANCE.md).

## Critérios de estabilização

1. API pública revisada e sem estilos hard-coded.
2. Stories em Light/Dark, incluindo estados relevantes.
3. Testes de interação e navegação por teclado.
4. Contraste e foco verificados em contexto.
5. Documentação e Figma alinhados.
6. Nenhum dado financeiro real em fixtures.
