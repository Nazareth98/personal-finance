# Corporate UI — Foundations v0.1

## Identidade visual

Design System corporativo, funcional, orientado a dashboards e finanças pessoais. Prioridades: legibilidade, alto contraste, densidade controlada, acessibilidade, uso responsável de cores e estados financeiros explícitos.

Figma: https://www.figma.com/design/OrPxvoVcl2Esk0iXoufxYr

## Contrato de tokens

Fonte de verdade técnica: `packages/tokens/src/themes.json`. Gerador: `packages/tokens/scripts/build.mjs`. Artefato: `packages/tokens/dist/theme.css` (gerado).

Os valores Light/Dark de cada token, a elevação e as camadas estão em [`DESIGN.md`](../../DESIGN.md), verificado contra o JSON por `pnpm design:check`. Cada token vira `--color-*`, `--shadow-*`, `--overlay-backdrop` ou `--z-*`.

Valores financeiros positivos e negativos devem ser identificados por **texto/sinal/ícone**, nunca exclusivamente por cor. Transferência própria é movimentação patrimonial, não receita nem despesa.

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
