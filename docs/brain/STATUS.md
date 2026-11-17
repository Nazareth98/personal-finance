# Status atual

Atualizado em: 17/11/2026.

## Situação

- Design system Corporate UI v0.6.2 implementado com Inter Variable auto-hospedada, tokens Light/Dark, ícones Lucide, biblioteca React, Storybook, templates e estados assíncronos. O shell agora mantém aparência e saída no rodapé da sidebar e alinha ações ao cabeçalho de cada template. Os 78 baselines precisam ser atualizados no CI Linux após as mudanças visuais intencionais.
- No modo autenticado, visão geral, contas, cartões/faturas, transações e relatórios consomem o livro Supabase; o modo de teste visual preserva fixtures sintéticas.
- Contas, categorias genéricas, lançamentos manuais, transferências conciliadas e ajustes vinculados estão implementados com centavos exatos.
- Metas percentuais por categoria, tetos mensais/anuais e alertas de aproximação ou estouro estão implementados sobre receitas confirmadas.
- Caixinhas com saldo reconstruível, aportes/resgates neutros e associação manual de lançamentos importados estão implementadas.
- MeuPluggy implementado em código com Connect Token no backend, conexões e execuções persistidas, importação completa/incremental idempotente, staging privado, webhook durável e retomada após falha. A tela distingue atualização da fonte, tentativa local, sucesso local e estado de erro.
- Categorização `rules-v1` implementada como overlay imutável, com normalização, evidências de estabelecimento/alias/token/conta/natureza, faixas 90/70, explicação versionada e aprendizado somente após confirmação.
- Cartões implementados com fechamento, vencimento, limite, faturas, entradas de compra/estorno/pagamento e parcelas futuras separadas do realizado. Compras sincronizadas usam a competência do vencimento e ficam no staging quando o calendário é desconhecido.
- Receitas recorrentes e extraordinárias separadas pelo overlay de categoria; salário Itaú reconhecido por instituição e descrição. A previsão combina média móvel de seis meses, base recorrente, tetos, parcelas futuras e aporte necessário para metas.
- PWA instalável com manifesto e ícones, fallback offline sem dados financeiros, cache restrito a assets estáticos e layout validado a partir de 320 px.
- Vercel é a hospedagem oficial e está configurada para o monorepo com build validado, saída `apps/web/dist`, headers de PWA e bloqueio de deploy sem variáveis públicas do Supabase. O projeto remoto `personal-finance` está vinculado, usa Node 22.x e possui URL/chave pública do Supabase em Production e Preview. GitHub Actions usa Node 22.12, lockfile congelado e valida fluxos autenticados/PWA.
- O projeto Supabase novo está vinculado: 11 migrations foram aplicadas, todas as tabelas públicas estão com RLS, as três Edge Functions MeuPluggy estão ativas, o Auth remoto bloqueia cadastro público com senha mínima de 12 caracteres e o único proprietário está provisionado em `public.profiles`.
- Plano funcional e regras centrais documentados no brain.
- Arquivo Figma conectado, mas a leitura automatizada ainda não foi validada nesta sessão.

## Marco atual

**Etapa 10 — semântica, revisão e reimportação controlada**, antes de validar novamente o MeuPluggy com dados reais.

Próximas entregas, nesta ordem:

1. ajustar a fila para separar pendências de histórico e integrar vínculos de caixinha/fatura;
2. executar limpeza seletiva do ambiente de desenvolvimento preservando aliases e reimportar todo o histórico;
3. configurar o webhook MeuPluggy e concluir o smoke test remoto.

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
- Supabase remoto em 16/11/2026: 9 migrations aplicadas e reconciliadas com o histórico local; 17 tabelas públicas confirmadas com RLS; coluna `last_source_updated_at` presente; funções `pluggy-connect-token`, `pluggy-sync` e `pluggy-webhook` ativas com fronteiras JWT corretas; Auth com cadastro público desativado e senha mínima de 12 caracteres.
- Provisionamento remoto em 16/11/2026: o único usuário Auth foi vinculado a `public.profiles` como proprietário; a correspondência entre Auth, perfil e `is_owner = true` foi confirmada por consulta administrativa sem expor dados pessoais.
- OpenDesign em 16/11/2026: aplicativo 0.27.1, plugin Codex 0.5.3 e MCP stdio instalados; `DESIGN.md` criado a partir dos tokens Light/Dark e componentes React existentes, com lint oficial sem erros ou avisos e exportação DTCG aprovada.
- Vercel remota em 16/11/2026: checkout vinculado a `patrick-nazareths-projects/personal-finance`; runtime corrigido de Node 26.x para 22.x; `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` configuradas em Production e Preview; variável legada `VITE_SUPABASE_ANON_KEY` removida; `pnpm check` e `vercel build --prod` aprovados com Node 22.12.
- Shell autenticado em 16/11/2026: direção visual definida com OpenDesign; saída movida para a sidebar, tema convertido em controle Light/Dark por ícones e ações alinhadas aos cabeçalhos dos nove templates. `pnpm check`, 14 cenários de comportamento, 54 auditorias WCAG A/AA e 13 fluxos autenticados aprovados; capturas Light/Dark em desktop e mobile revisadas localmente.
- Autenticação MeuPluggy em 16/11/2026: o JWT chegava válido à Edge Function, mas a validação interna perdia o cabeçalho por usar capitalização incompatível com o cliente Supabase. `requireOwner` foi corrigido; `pluggy-connect-token` e `pluggy-sync` versão 3 estão ativos em produção com verificação JWT; a tela agora exibe um toast acessível quando não consegue iniciar o fluxo. `pnpm check`, 14 fluxos autenticados e auditoria WCAG isolada aprovados (a execução agrupada da auditoria excedeu 30 s sem apontar violação e passou em 12 s quando repetida isoladamente).
- Compatibilidade MeuPluggy em 16/11/2026: identificado `410 ENDPOINT_DEPRECATED` na sincronização de uma aplicação nova. O cliente passou a usar `GET /v2/transactions` com cursor, corrigiu `clientUserId` para `options` e aguarda a sincronização terminar antes de fechar o fluxo, permitindo que falhas após o widget também gerem toast. Funções `pluggy-connect-token` e `pluggy-sync` versão 4 ativas em produção; contrato do cliente, dois cenários de toast e `pnpm check` aprovados.
- Idempotência MeuPluggy em 16/11/2026: o `upsert` do livro falhava porque o índice único parcial de `(owner_id, external_key)` não era inferido pelo `ON CONFLICT`. A migration substituiu-o por uma constraint única compatível, validada remotamente em transação com rollback; `pluggy-sync` versão 5 está ativa, erros estruturados do Supabase preservam a mensagem sanitizada e `pnpm check` foi aprovado.
- Sidebar em 16/11/2026: navegação redesenhada com indicador ativo, ícones destacados, recolhimento no desktop e cabeçalho compacto no mobile. Tokens Corporate UI preservados, movimento reduzido respeitado e nomes acessíveis mantidos no modo recolhido. `pnpm check`, 16 cenários de comportamento e 54 auditorias WCAG A/AA aprovados após corrigir os rótulos. Capturas Light/Dark revisadas localmente; baselines Linux ainda precisam de atualização e revisão. OpenDesign Cloud ficou indisponível por falha de transporte; a implementação seguiu o `DESIGN.md` existente.
- Rolagem da sidebar em 16/11/2026: no desktop, cabeçalho e rodapé ficaram fixos e somente a lista de abas rola quando a altura é insuficiente; estados expandido, recolhido e mobile foram verificados no Chromium em viewport reduzida, e `pnpm check` foi aprovado com Node 24.14.1.
- Diagnóstico semântico em 16/11/2026: a categoria genérica “transfer” do MeuPluggy neutraliza PIX para terceiros indevidamente; a revisão atual mistura fila e histórico, e correções de categoria não resolvem resgates/pagamentos com natureza incorreta. A Etapa 10 foi priorizada antes de uma reimportação controlada que preserve aliases.
- Etapa 10.1 em 16/11/2026: PIX/transferência genérica passou a seguir o sinal como receita/despesa; pagamento de fatura, aporte e resgate exigem evidência textual explícita e sinal compatível. Oito contratos sintéticos da integração e `pnpm check` foram aprovados com Node 24.14.1. `pluggy-sync` v7 e `pluggy-webhook` v4 estão ativos no Supabase com as fronteiras JWT preservadas. Transferências realmente próprias permanecem pendentes até o overlay/vínculo da Etapa 10.2.
- Etapa 10.2 em 17/11/2026: overlay semântico auditável, RLS e RPC atômica publicados no Supabase. Transferência própria exige contraparte conciliada; pagamento exige fatura; aporte/resgate exige caixinha. O adapter aplica a natureza efetiva antes da categoria, portanto totais e previsões usam o efeito corrigido sem alterar o registro importado. Smoke test remoto com rollback cobriu criação e substituição de vínculos; `pnpm check` passou com Node 24.14.1.

## Bloqueios

- Docker não está disponível nesta máquina; migrations e RLS foram aplicadas no Supabase hospedado, mas a execução local continua indisponível.
- A conta/sandbox MeuPluggy ainda precisa confirmar o SDK Connect, paginação e mecanismo real de assinatura do webhook antes do deploy.
- A fidelidade visual final depende de leitura ou exportação verificável do Figma.
- Os 78 baselines visuais precisam ser regenerados e revisados no CI Linux por causa da nova composição do shell; conexões também incorpora a coluna “Atualização da fonte”.

## Regra de atualização

Ao concluir um marco, mova o próximo item para “Marco atual”, registre validações executadas e mantenha somente pendências ainda relevantes.
