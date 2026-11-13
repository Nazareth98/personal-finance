# Corporate UI — Foundations v0.1

## Identidade visual

Design System corporativo, funcional, orientado a dashboards e finanças pessoais. Prioridades: legibilidade, alto contraste, densidade controlada, acessibilidade, uso responsável de cores e estados financeiros explícitos.

Figma: https://www.figma.com/design/OrPxvoVcl2Esk0iXoufxYr

## Contrato de tokens

Fonte de verdade técnica: `packages/tokens/src/themes.json`. Gerador: `packages/tokens/scripts/build.mjs`. Artefato: `packages/tokens/dist/theme.css` (gerado).

| Token CSS | Light | Dark |
| --- | --- | --- |
| `--color-bg-canvas` | #F8FAFC | #0B1220 |
| `--color-bg-surface` | #FFFFFF | #172235 |
| `--color-bg-subtle` | #F1F5F9 | #1E293B |
| `--color-text-primary` | #0F172A | #F8FAFC |
| `--color-text-secondary` | #64748B | #94A3B8 |
| `--color-border-default` | #E2E8F0 | #334155 |
| `--color-action-primary` | #2563EB | #3B82F6 |
| `--color-action-hover` | #1D4ED8 | #60A5FA |
| `--color-finance-income` | #15803D | #4ADE80 |
| `--color-finance-expense` | #B91C1C | #F87171 |
| `--color-finance-transfer` | #2563EB | #60A5FA |

Outros tokens (`status-*`) estão no JSON. Valores financeiros positivos e negativos devem ser identificados por **texto/sinal/ícone**, nunca exclusivamente por cor. Transferência própria é movimentação patrimonial, não receita nem despesa.

## Escalas

- Tipografia: Inter Variable auto-hospedada, eixo de peso contínuo 100–900 e fallback de sistema; 12, 14, 16, 18, 24, 32px.
- Espaçamento: 4, 8, 12, 16, 24, 32, 48px.
- Raios: 4, 8, 12, 16px.
- Alturas de controles: 32, 36, 40px.
- Disposição: conteúdo fluido; cards em grid, tabelas densas com suporte responsivo; números tabulares e BRL pt-BR.
- Temas: Light default e Dark via `html[data-theme="dark"]`, mantendo o mesmo conjunto de nomes semânticos.

## Princípios de qualidade

- Meta WCAG AA: contraste de texto comum 4.5:1 e texto grande 3:1; medir pares reais de cor em telas e estados.
- Foco visível e navegação por teclado.
- Evitar tooltips como única fonte de informação; usar rótulos explícitos para saldos, valores e competência.
- Estado vazio, carregamento, erro e confirmação de ações destrutivas.
- Não usar valores financeiros de produção em exemplos ou testes.

## Cores para valores positivos e negativos — atualização v0.5.1

Ver [Semântica financeira, gráficos e loading](CHARTS_AND_COLORS.md). Foram criados tokens independentes de `finance-income` / `finance-expense` para representar resultados positivos, negativos e neutros. Esse contrato deve ser reproduzido nas coleções Light e Dark do Figma.
