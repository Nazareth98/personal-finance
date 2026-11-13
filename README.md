# Personal Finance — Corporate UI

Base inicial de um gerenciador de finanças pessoais com **React + TypeScript**, biblioteca visual **Corporate UI** e design tokens Light/Dark.

> Este é um novo scaffold após o reset da branch `main`. Nenhum dado financeiro pessoal é incluído. A implementação anterior continua disponível no histórico Git.

## Iniciar

Requisitos: Node.js 22.12+ e pnpm 10+.

```bash
corepack enable
pnpm install
pnpm dev
```

O comando `pnpm dev` gera os tokens CSS antes de iniciar o Vite. Aplicação local: http://localhost:5173.

```bash
pnpm build
pnpm typecheck
```

## Estrutura

- `apps/web`: demonstração React de dashboard financeiro (dados fictícios).
- `packages/tokens`: fonte de verdade dos tokens semânticos e geração de CSS.
- `packages/ui`: componentes reutilizáveis React.
- `docs/design-system`: contratos de foundations, componentes e vínculo Figma.
- `docs/architecture`: decisões e próximos incrementos.
- `AGENTS.md`: instruções para Codex.

## Design no Figma

[Corporate UI — Foundations](https://www.figma.com/design/OrPxvoVcl2Esk0iXoufxYr)

O plano Starter do Figma não permite usar múltiplos modos na mesma coleção. Por isso, os temas foram representados em coleções separadas. **Os JSONs deste repositório são a fonte de verdade para a implementação**; veja `docs/design-system/FIGMA.md`.

## Escopo deste PR

Uma fundação **de interface e documentação**. Não implementa autenticação, persistência, Supabase, Open Finance, importações ou cálculos financeiros de produção. Não copiar dados privados ou históricos para fixtures.

## Documentação do Design System (v0.2)

```bash
pnpm tokens:check     # Valida Light/Dark e contraste de pares essenciais
pnpm test             # Node test runner: contratos de tokens
pnpm storybook        # Catálogo interativo em http://localhost:6006
pnpm storybook:build  # Compila a documentação
pnpm check            # Validação completa do Design System
```

Veja [componentes](docs/design-system/COMPONENTS.md), [governança](docs/design-system/GOVERNANCE.md) e [roadmap](docs/architecture/ROADMAP.md).

O Storybook apresenta os componentes Beta, mas não é evidência suficiente de acessibilidade completa. Os passos de CI usam instalação não congelada até ser gerado e revisado um `pnpm-lock.yaml`.

## Formulários (v0.3 Beta)

O dashboard demonstra `Select`, `Checkbox`, `RadioGroup`, `Dialog`, `ToastProvider` e `Button.loading`. Use o botão **Nova movimentação (demo)**, preencha os campos e valide: nada é persistido. A validação de valor financeiro usa centavos exatos (`bigint`).

Documentação: [Formulários](docs/design-system/FORMS.md). Stories: `pnpm storybook`.

## Data Display (v0.4 Beta)

O dashboard agora possui uma tabela de **movimentações fictícias** com busca, filtros, ordenação e paginação. KPI filtrados e a formatação BRL utilizam `bigint` para evitar perda de precisão; transferências internas não entram em totais de consumo/renda.

Componentes no Storybook: `DataTable`, `Pagination`, `MetricCard`, `Skeleton` e `EmptyState`.

Documentação de implementação: [Data Display](docs/design-system/DATA_DISPLAY.md).

## Templates financeiros — v0.5 Beta

Seis telas funcionais de demonstração via navegação na lateral: **Visão geral, Transações, Contas, Cartões e faturas, Orçamentos e Relatórios**. Os dados são fictícios e não há persistência nem acesso bancário.

Acesse cada tela em `/#overview`, `/#transactions`, `/#accounts`, `/#cards`, `/#budgets` e `/#reports`. O Storybook inclui prévias dos templates. Consulte [TEMPLATES.md](docs/design-system/TEMPLATES.md).

## Cores financeiras, gráficos e loading — v0.5.1

- Semântica positiva/negativa/neutra independente de receita/despesa/transferência e pareada em Light/Dark.
- Gráficos reutilizáveis: fluxo de caixa comparativo, linha de evolução e rosca de categorias, com valores exatos em centavos (`bigint`).
- Skeletons estruturais para tabela e gráficos: `TableSkeleton`, `ChartSkeleton`, com estados acessíveis e respeito a movimento reduzido.
- Storybook documenta os novos componentes com exemplos totalmente fictícios.

Consulte [Charts & Colors](docs/design-system/CHARTS_AND_COLORS.md).
