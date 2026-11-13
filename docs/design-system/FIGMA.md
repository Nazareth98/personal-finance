# Integração Figma ↔ GitHub ↔ Codex

Arquivo: [Corporate UI — Design System](https://www.figma.com/design/OrPxvoVcl2Esk0iXoufxYr).

## Estrutura atual no Figma

- `01 — Foundations`: cores primitivas, aliases de Light, espaçamento, raios e hierarquia tipográfica.
- `02 — Dark Foundations`: tokens de Dark e estados semânticos para finanças.
- `03 — Forms`: catálogo de seis **componentes Figma nativos e editáveis**:
  - Input / Default
  - Select / Default
  - Checkbox / Unchecked
  - RadioGroup / Default
  - Dialog / Base
  - Toast / Info
- Coleções de variáveis: `Corporate / Primitives`, `Corporate / Semantic Light`, `Corporate / Semantic Dark`, `Corporate / Geometry`.

## Limites atuais e estágio de maturidade

O plano Figma Starter oferece apenas **três páginas por arquivo** e apenas um modo por coleção. A página inicial vazia foi reaproveitada como `03 — Forms`, sem excluir as foundations anteriores. Os modos Light/Dark estão representados em coleções separadas.

Os seis componentes na página de formulários são **referências visuais nativas**, não variantes completamente construídas nem componentes com Code Connect. O comportamento real, os estados, a lógica do formulário e a documentação interativa estão no React/Storybook; o Figma não substitui esses contratos.

## Contrato de sincronização

1. Fonte técnica: `packages/tokens/src/themes.json`. Executar `pnpm tokens:check` e `pnpm build` após alterar tokens.
2. Atualizar manualmente as coleções visuais do Figma para corresponder à implementação.
3. Cada componente React deve possuir API tipada, Storybook, documentação e estados antes da promoção a Stable.
4. Ao evoluir o Figma, adicionar variantes e ligações de variáveis aos componentes sem quebrar os componentes atuais.
5. Trabalhar com commits versionados e executar `pnpm check` antes de declarar entrega. Branch `main` pode receber commits diretos quando explicitamente autorizado.
6. Dados financeiros reais nunca entram em Figma, screenshots, Stories nem fixtures públicas.

A sincronização Figma ↔ GitHub ainda **não é automática**. A criação completa de variantes, estados e Code Connect permanece no roadmap.

## Templates v0.5 no Figma

Na página `03 — Forms`, abaixo dos componentes de formulários e Data Display, foram criadas seis pranchas editáveis de referência: `Template / Visão geral`, `Template / Transações`, `Template / Contas`, `Template / Cartões e faturas`, `Template / Orçamentos`, `Template / Relatórios`.

Estas pranchas são **composições visuais esquemáticas**, não telas completas com interações ou Code Connect. A implementação navegável funcional está em `apps/web/src/pages` e as prévias no Storybook. Não foi criada outra página devido ao limite de três páginas do Figma Starter.

## v0.5.1 — Cores financeiras, gráficos e loading

Na página `03 — Forms`, seção `Corporate UI / Finance Colors & Charts v0.5.1`:

- `Foundation / Finance Colors Light & Dark`: amostras de resultado positivo, negativo, neutro e transferência.
- `Chart / Cash Flow`: comparativo de receitas/despesas.
- `Chart / Trend Line`: evolução do resultado.
- `Chart / Category Donut`: participação de despesas por categoria.
- `Loading / Table Skeleton`: referência de tabela em carregamento.
- `Loading / Chart Skeleton`: referência visual do carregamento de gráficos.

Foram criadas **24 variáveis adicionais** distribuídas nas coleções semânticas Light/Dark, incluindo `finance/positive`, `finance/negative`, `finance/neutral`, `chart/income`, `chart/expense`, `chart/neutral`, `chart/grid` e cinco cores categóricas por tema.

Estas são **referências visuais editáveis**, ainda não ligadas automaticamente por Code Connect nem estruturadas como componentes com todas as variantes. A fonte técnica dos valores e regras é `packages/tokens/src/themes.json`; a biblioteca React e os exemplos completos do Storybook implementam o comportamento.

Ver `CHARTS_AND_COLORS.md` para o contrato de semântica financeira e `TEMPLATES.md` para as telas que utilizam gráficos e loading.

## Consolidação Light/Dark — v0.5.2

A biblioteca mantém Light e Dark em coleções separadas pelo limite de modos do Starter. A equivalência de nomes e cores deve ser conferida com `packages/tokens/src/themes.json`. No Storybook, a story `Foundations/Light & Dark` usa os mesmos tokens para exibir componentes lado a lado. Consulte `THEMING.md`.
