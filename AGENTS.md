# Instruções para agentes — Balanço

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
- Use a skill `playwright-cli` ao interagir com navegador, verificar interfaces ou validar fluxos web.
- Use Node 22.x. A máquina alterna versões para projetos legados: confira `node -v` antes de `pnpm` e, se não for 22, rode `nvm use 22.13.0`.
- Faça a menor mudança completa; não antecipe abstrações ou funcionalidades de marcos futuros.
- Não restaure a implementação antiga do histórico Git. Reimplemente a partir dos contratos atuais.
- Não altere Supabase, migrations, infraestrutura ou dados remotos sem tarefa explícita.
- Antes de concluir código, execute `pnpm check` com Node 22.x; se não for possível, informe exatamente o que não foi validado.

## Contratos invariáveis

- Interface em português do Brasil e valores em BRL.
- Dinheiro no domínio usa `bigint` em centavos; nunca ponto flutuante.
- Receita, despesa, transferência própria, pagamento de fatura, aporte e resgate são naturezas distintas.
- Dados bancários, credenciais, CPF, salários, faturas e logs reais nunca entram em commits, fixtures, screenshots ou prompts.
- Cadastro público permanece desativado; cada instância tem um único usuário. O código serve a qualquer pessoa que faça fork: nada específico de uma pessoa ou banco entra em textos da interface.
- API Key do MeuPluggy existe somente no backend.
- Componentes genéricos ficam em `packages/ui`; funcionalidades financeiras ficam em `apps/web`.
- Tokens pertencem a `packages/tokens/src/themes.json`; não use cores hex inline em componentes.
- **O Design System “Personal Finance” é a referência visual de toda interface**: https://claude.ai/artifact/9AweKnLszsM8TkibsYZ29E (resumo em `docs/design-system/DESIGN_SYSTEM_ARTIFACT.md`). Tokens e código versionados são a fonte técnica; o Figma é histórico.
- Todo componente interativo exige teclado, foco, estados, labels, contraste e teste proporcional ao risco.

## Design System: sempre

Toda mudança de interface parte do Design System “Personal Finance” (artifact acima). Antes de criar ou mexer em tela, componente, diálogo ou formulário:

1. Leia `project/README.md` e `project/Componentes-e-padroes.md` do artifact (ou o resumo em `docs/design-system/DESIGN_SYSTEM_ARTIFACT.md`) e o README do componente envolvido em `project/components/<Comp>/`.
2. Use os componentes de `packages/ui` como o Design System descreve. Não monte controles soltos: escolha entre opções com descrição usa `VisualSelect`; lista simples usa `Select`; `RadioGroup` só para 2–3 opções curtas; data usa `DateField`, nunca `<input type="date">`; ações seguem as variantes de `Button`; diálogos seguem `Dialog`.
3. Sem cores, tamanhos ou espaçamentos fora dos tokens. Valide desktop e celular (≤ 680 px) antes de publicar.
4. Padrão novo ou alterado? Registre no artifact (Componentes e padrões) e no resumo do repositório no mesmo trabalho. Redesign grande passa por protótipo no Claude Design antes de implementar.

## Forks: cada pessoa, sua instância

Outras pessoas usam o Balanço em forks próprios (GitHub, Supabase, Vercel e MeuPluggy separados) que recebem `main` automaticamente todo dia ([`COMECE_AQUI.md`](docs/COMECE_AQUI.md), [`NEW_INSTANCE.md`](docs/architecture/NEW_INSTANCE.md)). Tudo o que entra em `main` roda nessas instâncias sem revisão de quem as usa.

- **Migrations rodam em todos os bancos.** Nunca coloque IDs, nomes, valores ou datas de uma pessoa. Ajuste nos dados de uma instância (religar um pagamento, marcar um lançamento) é feito direto nela, fora de migration. Correções retroativas em migration precisam de regra genérica e ser seguras em banco vazio ou com dados diferentes.
- **Regras por banco são aceitáveis; por pessoa, não.** Reconhecer como um banco descreve lançamentos é genérico. Nome do titular, contas e categorias vêm da configuração do usuário, nunca do código.
- **Mudanças precisam funcionar para quem ainda não tem o dado novo.** Colunas novas são opcionais ou têm padrão; a interface lida com instâncias vazias, recém-criadas ou sem o banco/cartão em questão.
- **A publicação é automática e sem volta fácil.** Evite migrations destrutivas; quando inevitáveis, apague só dado derivado que a sincronização recria e registre a decisão.
- **Textos, ajuda e documentação servem a quem não desenvolve.** Linguagem simples, sem dados reais nem referências à instância original. Mudou um comportamento visível? Atualize a ajuda da tela (`help-content.ts`), o glossário e, se afetar a instalação ou os primeiros dias, o `COMECE_AQUI.md`.
- **Configuração só pelo app ou pelos guias.** Quem usa um fork não edita arquivos; qualquer novo segredo ou variável exige passo documentado no `COMECE_AQUI.md` e no `NEW_INSTANCE.md`.

## Roteamento rápido

| Se a tarefa envolve... | Leia também |
| --- | --- |
| escopo, prioridade ou marco | `docs/brain/PLAN.md` |
| cálculo ou semântica financeira | `docs/brain/DOMAIN.md` |
| backend, banco, integração ou segurança | `docs/brain/ARCHITECTURE.md` |
| decisão histórica | `docs/brain/DECISIONS.md` |
| tokens ou fundamentos visuais | `docs/design-system/FOUNDATIONS.md`, `docs/design-system/THEMING.md` |
| qualquer interface | Design System “Personal Finance” (artifact) e `docs/design-system/DESIGN_SYSTEM_ARTIFACT.md` |
| componente de UI | `docs/design-system/COMPONENTS.md`, `docs/design-system/GOVERNANCE.md` |
| redesign com Claude Design | `docs/design-system/REDESIGN.md`, `DESIGN.md` |
| formulário | `docs/design-system/FORMS.md` |
| tabela, KPI ou resultado | `docs/design-system/DATA_DISPLAY.md` |
| gráfico ou cor financeira | `docs/design-system/CHARTS_AND_COLORS.md` |
| página ou navegação | `docs/design-system/TEMPLATES.md` |
| Figma | `docs/design-system/FIGMA.md` |
| mudança visual ou responsiva | `docs/quality/VISUAL_REGRESSION.md` |
| loading, erro, retry ou dado remoto | `docs/quality/ASYNC_STATES.md` |
