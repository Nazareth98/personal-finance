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

## Catálogo de dados — v0.4

Na página `03 — Forms`, abaixo da seção de formulários, existe uma seção **Corporate UI / Data Display v0.4** com componentes Figma editáveis de referência:
- `DataTable / Default`
- `Pagination / Default`
- `MetricCard / Income`
- `EmptyState / Default`
- `Skeleton / Loading`

A quantidade de páginas permanece em três devido ao limite do Figma Starter. Estas representações não possuem ainda conjuntos completos de variantes, interações de navegação ou Code Connect: a implementação executável e os contratos de tipos pertencem ao React/Storybook. Ver `DATA_DISPLAY.md`.
