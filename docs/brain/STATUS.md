# Status atual

Atualizado em: 14/11/2026.

## Situação

- Design system Corporate UI v0.6.2 implementado com Inter Variable auto-hospedada, tokens Light/Dark, ícones Lucide, biblioteca React, Storybook, templates e estados assíncronos. Há 78 baselines versionados, incluindo caixinhas, conexões e revisão em Light/Dark nos três viewports.
- Em produção, visão geral, contas, cartões/faturas, transações e relatórios consomem o livro Supabase; o modo de teste visual preserva fixtures sintéticas.
- Contas, categorias genéricas, lançamentos manuais, transferências conciliadas e ajustes vinculados estão implementados com centavos exatos.
- Metas percentuais por categoria, tetos mensais/anuais e alertas de aproximação ou estouro estão implementados sobre receitas confirmadas.
- Caixinhas com saldo reconstruível, aportes/resgates neutros e associação manual de lançamentos importados estão implementadas.
- MeuPluggy implementado em código com Connect Token no backend, conexões e execuções persistidas, importação completa/incremental idempotente, staging privado, webhook durável e retomada após falha. A tela exibe fonte, tentativa, sucesso e estado de erro.
- Categorização `rules-v1` implementada como overlay imutável, com normalização, evidências de estabelecimento/alias/token/conta/natureza, faixas 90/70, explicação versionada e aprendizado somente após confirmação.
- Cartões implementados com fechamento, vencimento, limite, faturas, entradas de compra/estorno/pagamento e parcelas futuras separadas do realizado. Compras sincronizadas usam a competência do vencimento e ficam no staging quando o calendário é desconhecido.
- Plano funcional e regras centrais documentados no brain.
- Arquivo Figma conectado, mas a leitura automatizada ainda não foi validada nesta sessão.

## Marco atual

**Etapa 8 — receitas e previsão**, sem restaurar o backend antigo.

Próximas entregas, nesta ordem:

1. reconhecer salário pela descrição do Itaú;
2. separar receita recorrente e extraordinária;
3. calcular média móvel dos seis meses recorrentes;
4. combinar despesas recorrentes, parcelas, metas e aportes planejados.

## Última validação

- Etapa 0: validações estáticas, testes unitários, typecheck, build web e Storybook aprovados.
- Etapa 1: 3 fluxos de autenticação, 14 cenários comportamentais e 54 cenários de acessibilidade/estados aprovados no Chromium.
- Etapa 2: cálculos do livro, migration/RLS estática e 7 fluxos autenticados aprovados no Chromium, incluindo auditoria WCAG das telas reais.
- Etapa 3: cálculos mensais/anuais em pontos-base, migration/RLS estática e 8 fluxos autenticados aprovados no Chromium, incluindo criação de meta e auditoria WCAG.
- Etapa 4: saldo reconstruído em centavos exatos, migration/RLS estática, 9 fluxos autenticados e 60 cenários responsivos/acessíveis executados no Chromium (56 aprovados e 4 skips esperados).
- Etapa 5: `pnpm check` aprovado; 3 contratos de normalização/centavos, validações estáticas de isolamento/idempotência, 10 fluxos autenticados e 84 cenários responsivos/acessíveis executados no Chromium (80 aprovados e 4 skips esperados). Os 6 baselines de conexões foram gerados e revisados.
- Etapa 6: 3 contratos do classificador, validação estática de overlay/RLS/aprendizado, 11 fluxos autenticados e 90 cenários responsivos/acessíveis executados no Chromium (86 aprovados e 4 skips esperados). Os 6 baselines de revisão foram gerados e revisados.
- Etapa 7: `pnpm check` aprovado; 3 contratos de competência/fatura/parcelas, validação estática de RLS e separação realizado/projetado, 12 fluxos autenticados e 90 cenários responsivos/acessíveis executados no Chromium (86 aprovados e 4 skips esperados). O modo demonstrativo de cartões não mudou e nenhum baseline foi atualizado.
- Migrations de acesso, livro, MeuPluggy, categorização e cartões verificadas estaticamente; execução real no PostgreSQL/RLS permanece pendente para o Supabase hospedado.

## Bloqueios

- Docker não está disponível nesta máquina; migrations e RLS não serão executadas localmente.
- A conta/sandbox MeuPluggy ainda precisa confirmar o SDK Connect, paginação e mecanismo real de assinatura do webhook antes do deploy.
- A fidelidade visual final depende de leitura ou exportação verificável do Figma.
- Alterações reais no Supabase exigem autorização explícita.

## Regra de atualização

Ao concluir um marco, mova o próximo item para “Marco atual”, registre validações executadas e mantenha somente pendências ainda relevantes.
