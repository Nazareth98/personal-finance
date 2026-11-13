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
