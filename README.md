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

## Para quem desenvolve

Requisitos: Node.js 22.x (22.12+) e pnpm 10+.

```bash
corepack enable
pnpm install
pnpm dev     # http://localhost:5173 — sem Supabase configurado, abre em modo de exemplo com dados fictícios
pnpm check   # validação completa (tokens, tipos, testes, build)
```

Testes de tela (Playwright) rodam no GitHub Actions Linux, onde ficam as referências visuais: `pnpm test:visual`, `pnpm test:e2e`, `pnpm test:a11y`. Um commit com `[update visual baselines]` regenera as referências.

### Estrutura

- `apps/web`: o app (React + Vite, PWA).
- `packages/domain`: regras financeiras puras (centavos em `bigint`).
- `packages/ui` e `packages/tokens`: design system e tokens Light/Dark.
- `supabase/`: migrations, RLS e Edge Functions do MeuPluggy, publicadas pelo workflow **Supabase — publicar backend**.
- `docs/brain`: contexto, regras de domínio, decisões (`DECISIONS.md`) e estado atual. Comece por [`docs/brain/README.md`](docs/brain/README.md).
- `docs/architecture`: banco, autenticação, cartões, previsão, deploy e [nova instância](docs/architecture/NEW_INSTANCE.md).
- `docs/design-system` e `docs/quality`: componentes, temas, gráficos e regressão visual.
- `AGENTS.md`: regras para agentes de código.

### Regras que não mudam

- Uma instância, um proprietário; cadastro público desativado ([`AUTH.md`](docs/architecture/AUTH.md)).
- A chave do Pluggy fica só no backend (Vault).
- Dados bancários reais nunca entram em commits, fixtures, prints ou prompts.
- Nada específico de uma pessoa ou banco nos textos da interface.
- Leia [`DATABASE.md`](docs/architecture/DATABASE.md) antes de criar migrations.
