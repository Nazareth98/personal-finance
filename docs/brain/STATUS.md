# Status atual

Atualizado em: 13/11/2026.

## Situação

- Design system Corporate UI v0.6.2 implementado com Inter Variable auto-hospedada, tokens Light/Dark, ícones Lucide, biblioteca React, Storybook, templates e estados assíncronos. Há 60 baselines versionados e 6 novos da tela de caixinhas aguardando geração no CI Linux.
- Em produção, visão geral, contas, cartões-base, transações e relatórios consomem o livro Supabase; o modo de teste visual preserva fixtures sintéticas.
- Contas, categorias genéricas, lançamentos manuais, transferências conciliadas e ajustes vinculados estão implementados com centavos exatos.
- Metas percentuais por categoria, tetos mensais/anuais e alertas de aproximação ou estouro estão implementados sobre receitas confirmadas.
- Caixinhas com saldo reconstruível, aportes/resgates neutros e associação manual de lançamentos importados estão implementadas.
- Plano funcional e regras centrais documentados no brain.
- Arquivo Figma conectado, mas a leitura automatizada ainda não foi validada nesta sessão.

## Marco atual

**Etapa 5 — MeuPluggy**, sem restaurar o backend antigo.

Próximas entregas, nesta ordem:

1. conectar Nubank, Caixa e Itaú exclusivamente pelo MeuPluggy;
2. persistir conexões e importar todo o histórico de forma idempotente;
3. processar incrementos e webhooks retomáveis;
4. exibir atualização da fonte, última importação, tentativa e erro.

## Última validação

- Etapa 0: validações estáticas, testes unitários, typecheck, build web e Storybook aprovados.
- Etapa 1: 3 fluxos de autenticação, 14 cenários comportamentais e 54 cenários de acessibilidade/estados aprovados no Chromium.
- Etapa 2: cálculos do livro, migration/RLS estática e 7 fluxos autenticados aprovados no Chromium, incluindo auditoria WCAG das telas reais.
- Etapa 3: cálculos mensais/anuais em pontos-base, migration/RLS estática e 8 fluxos autenticados aprovados no Chromium, incluindo criação de meta e auditoria WCAG.
- Etapa 4: saldo reconstruído em centavos exatos, migration/RLS estática, 9 fluxos autenticados e 60 cenários responsivos/acessíveis executados no Chromium (56 aprovados e 4 skips esperados).
- Migrations de acesso e livro verificadas estaticamente; execução real no PostgreSQL/RLS permanece pendente para o Supabase hospedado.

## Bloqueios

- Docker não está disponível nesta máquina; migrations e RLS não serão executadas localmente.
- A fidelidade visual final depende de leitura ou exportação verificável do Figma.
- Alterações reais no Supabase exigem autorização explícita.

## Regra de atualização

Ao concluir um marco, mova o próximo item para “Marco atual”, registre validações executadas e mantenha somente pendências ainda relevantes.
