# Instruções para agentes — Personal Finance

## Leitura obrigatória e econômica

Antes de qualquer tarefa, leia somente:

1. `docs/brain/CONTEXT.md` — objetivo e decisões vigentes.
2. `docs/brain/STATUS.md` — estado atual e próximo marco.

Depois consulte apenas os arquivos indicados em `docs/brain/README.md` para o assunto da tarefa. Não carregue toda a documentação preventivamente.

Ao terminar uma mudança relevante:

- atualize `STATUS.md` se o estado ou próximo passo mudou;
- atualize `CONTEXT.md` apenas se uma decisão vigente mudou;
- registre decisões novas ou substituídas em `DECISIONS.md`;
- mantenha os documentos curtos e use links em vez de duplicar conteúdo.

## Forma de trabalho

- Use a skill `ponytail` em toda tarefa de programação, no modo `full`.
- Use a skill `playwright` ao interagir com navegador, verificar interfaces ou validar fluxos web.
- Faça a menor mudança completa; não antecipe abstrações ou funcionalidades de marcos futuros.
- Não restaure a implementação antiga do histórico Git. Reimplemente a partir dos contratos atuais.
- Não altere Supabase, migrations, infraestrutura ou dados remotos sem tarefa explícita.
- Antes de concluir código, execute `pnpm check`; se não for possível, informe exatamente o que não foi validado.

## Contratos invariáveis

- Interface em português do Brasil e valores em BRL.
- Dinheiro no domínio usa `bigint` em centavos; nunca ponto flutuante.
- Receita, despesa, transferência própria, pagamento de fatura, aporte e resgate são naturezas distintas.
- Dados bancários, credenciais, CPF, salários, faturas e logs reais nunca entram em commits, fixtures, screenshots ou prompts.
- Cadastro público permanece desativado; o produto é para um único usuário.
- API Key do MeuPluggy existe somente no backend.
- Componentes genéricos ficam em `packages/ui`; funcionalidades financeiras ficam em `apps/web`.
- Tokens pertencem a `packages/tokens/src/themes.json`; não use cores hex inline em componentes.
- O Figma é a referência visual; tokens e código versionados são a fonte técnica.
- Todo componente interativo exige teclado, foco, estados, labels, contraste e teste proporcional ao risco.

## Roteamento rápido

| Se a tarefa envolve... | Leia também |
| --- | --- |
| escopo, prioridade ou marco | `docs/brain/PLAN.md` |
| cálculo ou semântica financeira | `docs/brain/DOMAIN.md` |
| backend, banco, integração ou segurança | `docs/brain/ARCHITECTURE.md` |
| decisão histórica | `docs/brain/DECISIONS.md` |
| tokens ou fundamentos visuais | `docs/design-system/FOUNDATIONS.md`, `docs/design-system/THEMING.md` |
| componente de UI | `docs/design-system/COMPONENTS.md`, `docs/design-system/GOVERNANCE.md` |
| formulário | `docs/design-system/FORMS.md` |
| tabela, KPI ou resultado | `docs/design-system/DATA_DISPLAY.md` |
| gráfico ou cor financeira | `docs/design-system/CHARTS_AND_COLORS.md` |
| página ou navegação | `docs/design-system/TEMPLATES.md` |
| Figma | `docs/design-system/FIGMA.md` |
| mudança visual ou responsiva | `docs/quality/VISUAL_REGRESSION.md` |
| loading, erro, retry ou dado remoto | `docs/quality/ASYNC_STATES.md` |
