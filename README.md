# Balanço

Suas contas, cartões, metas e caixinhas num só lugar, com os dados que o seu banco envia pelo [MeuPluggy](https://meu.pluggy.ai). Feito para uso pessoal: cada pessoa tem a própria instância, com os próprios dados, nas próprias contas gratuitas.

- **Visão geral** do mês, sem contar duas vezes o dinheiro que só mudou de conta.
- **Cartões e faturas** no mês do vencimento, com parcelas futuras.
- **Metas** em reais por categoria e **caixinhas** com objetivo e prazo.
- **Revisão** só do que o app não conseguiu decidir sozinho.
- Ajuda em cada tela, glossário e “Primeiros passos” dentro do app.

## Quero o meu

Não precisa programar. Siga o guia passo a passo: [**Comece aqui**](docs/COMECE_AQUI.md). Leva cerca de uma hora e usa só planos gratuitos (GitHub, Supabase, Vercel e MeuPluggy). Sua cópia se atualiza sozinha todo dia.

Para quem administra: o roteiro técnico está em [`docs/architecture/NEW_INSTANCE.md`](docs/architecture/NEW_INSTANCE.md).

## Desenvolvimento

Requisitos: Node.js 22.x (22.12+) e pnpm 10+. Outras versões majors não são suportadas, mesmo que funcionem.

```bash
nvm use 22.13.0   # ou outra 22.x instalada
corepack enable
pnpm install
pnpm dev
```

O comando `pnpm dev` gera os tokens CSS antes de iniciar o Vite. Aplicação local: http://localhost:5173.

```bash
pnpm build
pnpm typecheck
```

O backend é versionado em `supabase/`. O cadastro público permanece desativado; consulte [`docs/architecture/DATABASE.md`](docs/architecture/DATABASE.md) antes de criar migrations e [`docs/architecture/AUTH.md`](docs/architecture/AUTH.md) para provisionar o proprietário. Nesta máquina, a validação não usa Docker: migrations e RLS devem ser confirmadas no Supabase hospedado.

## Estrutura

- `apps/web`: o app (sem Supabase configurado, abre em modo de exemplo com dados fictícios).
- `packages/tokens`: fonte de verdade dos tokens semânticos e geração de CSS.
- `packages/ui`: componentes reutilizáveis React.
- `docs/brain`: contexto enxuto, regras de domínio, arquitetura e plano do produto.
- `docs/design-system`: contratos de foundations, componentes e vínculo Figma.
- `docs/architecture`: decisões e próximos incrementos.
- `AGENTS.md`: instruções para agentes de código.

## Contexto do produto

Comece por [`docs/brain/CONTEXT.md`](docs/brain/CONTEXT.md) e [`docs/brain/STATUS.md`](docs/brain/STATUS.md). O índice [`docs/brain/README.md`](docs/brain/README.md) indica qual documento adicional ler por tipo de tarefa, evitando carregar toda a documentação em cada prompt.

## Design no Figma

[Corporate UI — Foundations](https://www.figma.com/design/OrPxvoVcl2Esk0iXoufxYr)

O plano Starter do Figma não permite usar múltiplos modos na mesma coleção. Por isso, os temas foram representados em coleções separadas. **Os JSONs deste repositório são a fonte de verdade para a implementação**; veja `docs/design-system/FIGMA.md`.

## Estado da implementação

A fundação, o acesso do único proprietário, o livro financeiro, metas, caixinhas, MeuPluggy, categorização explicável, cartões, previsão financeira e PWA seguro estão implementados no código. O modo visual de teste usa dados fictícios; em produção, contas e lançamentos vêm do Supabase. A integração exige migrations, secrets e Edge Functions publicados no ambiente hospedado antes do uso real. Não copiar dados privados ou históricos para fixtures.

## Documentação do Design System (v0.6.2)

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

## Consolidação de temas — v0.5.2

Escolha **Aparência → Automático, Light ou Dark** no app. O padrão Automático segue a preferência do sistema e reage às mudanças, sem flash inicial. A escolha é persistida em `localStorage['pf-theme']` quando disponível.

A story `Foundations/Light & Dark` compara os dois temas simultaneamente. Regras completas: [THEMING.md](docs/design-system/THEMING.md).

## Validação visual e acessibilidade — v0.6

O Playwright mantém 78 baselines Light/Dark em mobile, tablet e desktop. Os baselines são gerados e comparados no GitHub Actions Linux para evitar diferenças de renderização entre sistemas operacionais.

```bash
pnpm build
pnpm exec playwright install --with-deps chromium
pnpm test:visual
pnpm test:e2e
pnpm test:a11y
```

Leia [VISUAL_REGRESSION.md](docs/quality/VISUAL_REGRESSION.md). A certificação acessível e a integração Figma/Code Connect permanecem pendentes.

## PWA e deploy

O build de produção é instalável e oferece somente um shell estático offline; dados financeiros exigem sessão e rede. Valide com `pnpm pwa:check` e `pnpm test:pwa`. Consulte [PWA.md](docs/architecture/PWA.md) e [DEPLOYMENT.md](docs/architecture/DEPLOYMENT.md). Nenhum ambiente remoto é alterado por esses comandos.

Na Vercel, mantenha a raiz do projeto no repositório, configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` e deixe `vercel.json` executar `pnpm vercel:build`. A integração Git publica automaticamente a `main` somente quando o build encontra a configuração pública necessária.

## Testes de gráficos, erros e loading — v0.6.2

`DataState` alterna sucesso, skeleton e erro com retry, sem acoplamento à fonte de dados. O app demonstrativo permite simular erro e loading nos gráficos e nas transações.

```bash
pnpm test:states
pnpm test:states:visual
```

Os 78 baselines cobrem nove templates e quatro estados adicionais por viewport e tema. Consulte [ASYNC_STATES](docs/quality/ASYNC_STATES.md).
