# Status atual

Atualizado em: 16/11/2026.

## Situação

- Design system Corporate UI v0.6.2 implementado com Inter Variable auto-hospedada, tokens Light/Dark, ícones Lucide, biblioteca React, Storybook, templates e estados assíncronos. Há 78 baselines versionados; os 6 de conexões precisam ser atualizados no CI Linux após a nova coluna operacional.
- No modo autenticado, visão geral, contas, cartões/faturas, transações e relatórios consomem o livro Supabase; o modo de teste visual preserva fixtures sintéticas.
- Contas, categorias genéricas, lançamentos manuais, transferências conciliadas e ajustes vinculados estão implementados com centavos exatos.
- Metas percentuais por categoria, tetos mensais/anuais e alertas de aproximação ou estouro estão implementados sobre receitas confirmadas.
- Caixinhas com saldo reconstruível, aportes/resgates neutros e associação manual de lançamentos importados estão implementadas.
- MeuPluggy implementado em código com Connect Token no backend, conexões e execuções persistidas, importação completa/incremental idempotente, staging privado, webhook durável e retomada após falha. A tela distingue atualização da fonte, tentativa local, sucesso local e estado de erro.
- Categorização `rules-v1` implementada como overlay imutável, com normalização, evidências de estabelecimento/alias/token/conta/natureza, faixas 90/70, explicação versionada e aprendizado somente após confirmação.
- Cartões implementados com fechamento, vencimento, limite, faturas, entradas de compra/estorno/pagamento e parcelas futuras separadas do realizado. Compras sincronizadas usam a competência do vencimento e ficam no staging quando o calendário é desconhecido.
- Receitas recorrentes e extraordinárias separadas pelo overlay de categoria; salário Itaú reconhecido por instituição e descrição. A previsão combina média móvel de seis meses, base recorrente, tetos, parcelas futuras e aporte necessário para metas.
- PWA instalável com manifesto e ícones, fallback offline sem dados financeiros, cache restrito a assets estáticos e layout validado a partir de 320 px.
- Vercel é a hospedagem oficial e está configurada para o monorepo com build validado, saída `apps/web/dist`, headers de PWA e bloqueio de deploy sem variáveis públicas do Supabase. GitHub Actions usa Node 22.12, lockfile congelado e valida fluxos autenticados/PWA.
- O projeto Supabase novo está vinculado: as 8 migrations foram aplicadas, todas as tabelas públicas estão com RLS, as três Edge Functions MeuPluggy estão ativas e o Auth remoto bloqueia cadastro público com senha mínima de 12 caracteres.
- Plano funcional e regras centrais documentados no brain.
- Arquivo Figma conectado, mas a leitura automatizada ainda não foi validada nesta sessão.

## Marco atual

**Etapa 9 — ativação do Supabase novo e deploy Vercel**, sem restaurar o backend antigo.

Próximas entregas, nesta ordem:

1. criar o usuário Auth proprietário e provisionar `public.profiles`;
2. cadastrar secrets MeuPluggy rotacionados no Supabase;
3. configurar a Vercel com URL/chave pública e concluir URLs do Auth;
4. validar MeuPluggy em sandbox, configurar o webhook e executar smoke test remoto.

## Última validação

- Etapa 0: validações estáticas, testes unitários, typecheck, build web e Storybook aprovados.
- Etapa 1: 3 fluxos de autenticação, 14 cenários comportamentais e 54 cenários de acessibilidade/estados aprovados no Chromium.
- Etapa 2: cálculos do livro, migration/RLS estática e 7 fluxos autenticados aprovados no Chromium, incluindo auditoria WCAG das telas reais.
- Etapa 3: cálculos mensais/anuais em pontos-base, migration/RLS estática e 8 fluxos autenticados aprovados no Chromium, incluindo criação de meta e auditoria WCAG.
- Etapa 4: saldo reconstruído em centavos exatos, migration/RLS estática, 9 fluxos autenticados e 60 cenários responsivos/acessíveis executados no Chromium (56 aprovados e 4 skips esperados).
- Etapa 5: `pnpm check` aprovado; 3 contratos de normalização/centavos, validações estáticas de isolamento/idempotência, 10 fluxos autenticados e 84 cenários responsivos/acessíveis executados no Chromium (80 aprovados e 4 skips esperados). Os 6 baselines de conexões foram gerados e revisados.
- Etapa 6: 3 contratos do classificador, validação estática de overlay/RLS/aprendizado, 11 fluxos autenticados e 90 cenários responsivos/acessíveis executados no Chromium (86 aprovados e 4 skips esperados). Os 6 baselines de revisão foram gerados e revisados.
- Etapa 7: `pnpm check` aprovado; 3 contratos de competência/fatura/parcelas, validação estática de RLS e separação realizado/projetado, 12 fluxos autenticados e 90 cenários responsivos/acessíveis executados no Chromium (86 aprovados e 4 skips esperados). O modo demonstrativo de cartões não mudou e nenhum baseline foi atualizado.
- Etapa 8: `pnpm check` aprovado; 3 contratos de recorrência/previsão, validação estática de reconhecimento e imutabilidade, 13 fluxos autenticados e 90 cenários responsivos/acessíveis executados no Chromium (86 aprovados e 4 skips esperados). O modo demonstrativo de relatórios não mudou e nenhum baseline foi atualizado.
- Etapa 9 local: `pnpm check` aprovado; manifesto, instalação, ícones e service worker validados estaticamente e em build de produção; fallback offline recusou rota financeira sem rede; 13 fluxos autenticados e 108 cenários responsivos/acessíveis/PWA executados no Chromium (89 aprovados e 19 skips esperados), incluindo 320 px. O modo demonstrativo não mudou e nenhum baseline foi atualizado. Deploy remoto foi adiado pelo proprietário e depende de credenciais.
- Pós-pull em 16/11/2026: `pnpm check`, 13 fluxos autenticados e 6 auditorias WCAG da tela de conexões aprovados após formalizar Vercel e persistir `Item.lastUpdatedAt` como atualização da fonte.
- Supabase remoto em 16/11/2026: 8 migrations aplicadas e reconciliadas com o histórico local; 17 tabelas públicas confirmadas com RLS; coluna `last_source_updated_at` presente; funções `pluggy-connect-token`, `pluggy-sync` e `pluggy-webhook` ativas com fronteiras JWT corretas; Auth com cadastro público desativado e senha mínima de 12 caracteres.
- OpenDesign em 16/11/2026: aplicativo 0.27.1, plugin Codex 0.5.3 e MCP stdio instalados; `DESIGN.md` criado a partir dos tokens Light/Dark e componentes React existentes, com lint oficial sem erros ou avisos e exportação DTCG aprovada.

## Bloqueios

- Docker não está disponível nesta máquina; migrations e RLS foram aplicadas no Supabase hospedado, mas a execução local continua indisponível.
- A conta/sandbox MeuPluggy ainda precisa confirmar o SDK Connect, paginação e mecanismo real de assinatura do webhook antes do deploy.
- A fidelidade visual final depende de leitura ou exportação verificável do Figma.
- Os 6 baselines de conexões precisam ser regenerados e revisados no CI Linux por causa da coluna “Atualização da fonte”.
- A validação real das policies com proprietário e sessão não autorizada depende da criação do único usuário Auth.

## Regra de atualização

Ao concluir um marco, mova o próximo item para “Marco atual”, registre validações executadas e mantenha somente pendências ainda relevantes.
