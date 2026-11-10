# Meu financeiro

Aplicação React + Vite + TypeScript, PostgreSQL/Supabase Auth e workspace privado por usuário.

## Executar

Requisitos: Node LTS 24+ e npm. Configure `VITE_SUPABASE_URL` e uma chave pública anon/publishable para o projeto Supabase remoto escolhido. Nunca use `service_role` ou secrets em variáveis `VITE_*`.

```sh
npm ci
npm run dev
```

Não executar Supabase local, conforme decisão do proprietário. Auth e migrations serão homologados no ambiente real seguindo [DEPLOY_VALIDATION](docs/brain/DEPLOY_VALIDATION.md).

## Funcionalidades

- Cadastro, login, confirmação de e-mail, recuperação de senha e workspace privado.
- RLS, referências compostas por workspace, armazenamento privado e escrita financeira por RPC.
- Contas, cartões, categorias/subcategorias/regras, receitas, VR/VA, transferências, empréstimos, aportes e resgates em centavos exatos.
- Dashboard mensal/anual, metas fixas/percentuais, holerites, adiantamentos, caixinhas, faturas, parcelamentos e revisão de importações.
- CSV/OFX/QFX/XLSX e PDF digital, prévia, revisão e deduplicação idempotente. XLS antigo exige conversão para XLSX.
- Meu Pluggy pessoal e owner-only: o titular importa suas próprias contas; outros usuários continuam com importação manual. Detalhes e limites em [MEUPLUGGY](docs/brain/MEUPLUGGY.md).
- Exportação JSON e restauração aditiva no mesmo workspace; vínculos Meu Pluggy restaurados não reativam acesso.

## Verificação e deploy

```sh
npm run typecheck
npm run lint
npm run build
```

A integração Meu Pluggy requer publicação manual da Edge Function e configuração dos secrets documentados em [MEUPLUGGY](docs/brain/MEUPLUGGY.md). Nenhum deploy remoto ou homologação real foi realizado nesta alteração.

Leia [o índice do brain](docs/brain/README.md), [regras financeiras](docs/brain/BUSINESS_RULES.md), [plano de verificação](docs/brain/TEST_PLAN.md) e [pendências](docs/brain/KNOWN_ISSUES.md). Não adicionar dados financeiros reais a fixtures, logs ou commits.
