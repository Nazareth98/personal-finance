# Status atual

Atualizado em: 13/11/2026.

## Situação

- Design system Corporate UI v0.6.2 implementado com Inter Variable auto-hospedada, tokens Light/Dark, ícones Lucide, biblioteca React, Storybook, templates, estados assíncronos e 60 baselines visuais.
- Em produção, visão geral, contas, cartões-base, transações e relatórios consomem o livro Supabase; o modo de teste visual preserva fixtures sintéticas.
- Contas, categorias genéricas, lançamentos manuais, transferências conciliadas e ajustes vinculados estão implementados com centavos exatos.
- Plano funcional e regras centrais documentados no brain.
- Arquivo Figma conectado, mas a leitura automatizada ainda não foi validada nesta sessão.

## Marco atual

**Etapa 3 — metas por categoria**, sem restaurar o backend antigo.

Próximas entregas, nesta ordem:

1. modelar percentuais por categoria e período;
2. calcular tetos sobre toda receita confirmada do período;
3. exibir acompanhamento mensal e anual sem acumulação;
4. alertar aproximação e estouro do teto.

## Última validação

- Etapa 0: validações estáticas, testes unitários, typecheck, build web e Storybook aprovados.
- Etapa 1: 3 fluxos de autenticação, 14 cenários comportamentais e 54 cenários de acessibilidade/estados aprovados no Chromium.
- Etapa 2: cálculos do livro, migration/RLS estática e 7 fluxos autenticados aprovados no Chromium, incluindo auditoria WCAG das telas reais.
- Migrations de acesso e livro verificadas estaticamente; execução real no PostgreSQL/RLS permanece pendente para o Supabase hospedado.

## Bloqueios

- Docker não está disponível nesta máquina; migrations e RLS não serão executadas localmente.
- A fidelidade visual final depende de leitura ou exportação verificável do Figma.
- Alterações reais no Supabase exigem autorização explícita.

## Regra de atualização

Ao concluir um marco, mova o próximo item para “Marco atual”, registre validações executadas e mantenha somente pendências ainda relevantes.
