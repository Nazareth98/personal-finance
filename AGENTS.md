# Instruções para agentes — Personal Finance

1. Leia `README.md`, `docs/design-system/FOUNDATIONS.md` e `docs/architecture/ROADMAP.md` antes de alterar a interface.
2. O Design System é **Corporate UI**: funcional, legível, profissional, preparado para dados densos e responsivo.
3. Tokens de tema pertencem a `packages/tokens/src/themes.json`. **Não codifique novas cores hex nos componentes**; use variáveis `--color-*` geradas.
4. Para adicionar ou modificar token, atualize o JSON, execute `pnpm --filter @personal-finance/tokens build` e documente alterações compartilhadas.
5. Componentes genéricos pertencem a `packages/ui/src`; funcionalidades financeiras pertencem a `apps/web/src`. Evite criar componentes duplicados.
6. Light e Dark usam os **mesmos nomes semânticos**. A alternância usa `data-theme="dark"` no elemento `html`.
7. Todo texto de interface deve ser em português do Brasil; valores monetários exibidos em BRL (`pt-BR`).
8. Dados reais (bancários, salariais, faturas, CPF, chaves, logs sensíveis) jamais entram em fixtures, screenshots, commits ou prompts. Use somente dados fictícios identificados.
9. Quando implementar o domínio, use valores monetários inteiros em centavos e preserve distinções entre despesa, receita, transferência, pagamento de fatura e aporte. Não inferir regras financeiras a partir de cores ou categorias.
10. Antes de concluir uma mudança de código, executar `pnpm typecheck` e `pnpm build`; se não for possível, indicar explicitamente que os comandos não foram executados.
11. Não modificar infraestrutura real, migrations, dados remotos ou Supabase sem tarefa explícita. A implementação anterior foi removida no reset; não restaurar funcionalidades automaticamente.
12. Para componentes interativos: teclado, estados focus/disabled/loading, labels, contraste, testes e acessibilidade. Evitar cor como único meio de transmitir significado.
13. O Figma é a referência visual: https://www.figma.com/design/OrPxvoVcl2Esk0iXoufxYr . Código e tokens versionados no GitHub são a fonte de verdade técnica.
14. Prefira alterações pequenas, documentadas, com PR; proteja a `main` de mudanças diretas não revisadas.

## Contratos adicionais — v0.2

15. Consulte `docs/design-system/COMPONENTS.md` e `docs/design-system/GOVERNANCE.md` ao criar ou refatorar componentes.
16. Crie stories no Storybook para cada componente e variante; inclua estados disabled/error e testes de interação antes de classificar como Stable.
17. Rode `pnpm check` e registre resultado; nunca alegue que testes foram executados se não foram.
18. O CI verifica contraste mínimo de pares de texto críticos, mas não substitui auditoria acessível de todas as telas.
19. Para codificar cores: `text-on-action` e `text-on-danger` são tokens obrigatórios de contraste; nenhuma cor hexadecimal inline em componentes.
20. Toda nova variável semântica deve existir em Light e Dark e ser adicionada à documentação e ao Figma.

## Regras adicionais — formulários v0.3

21. Consultar `docs/design-system/FORMS.md` antes de criar campos, validação ou diálogos.
22. Usar primitives de `@personal-finance/ui` (Input, Select, Checkbox, RadioGroup, Dialog, Toast) em vez de recriar controles no app.
23. Nunca persistir uma transação real a partir de um componente de apresentação ou da demo; validação do cliente é apenas auxílio de UX.
24. Para dinheiro, converter string de BRL em `bigint` centavos sem ponto flutuante; conferir nomes de natureza financeira.
25. Todo novo componente de formulário exige Storybook e teste de estado crítico antes de estabilizar API.

## Dados e dashboards — v0.4

26. Leia `docs/design-system/DATA_DISPLAY.md` antes de criar tabelas, filtros, KPI ou componentes de resultado.
27. Use `DataTable`, `Pagination`, `MetricCard`, `EmptyState`, `Skeleton` da biblioteca antes de criar variantes no app.
28. Filtre, ordene e só depois pagine; use chave estável e status de página acessível.
29. Valores monetários pertencem a `bigint` centavos e ordenação numérica precisa ser exata, sem `Number` em cálculos de domínio.
30. Transferências próprias são movimentações patrimoniais e não alteram totais de renda/consumo na demo.
31. Exemplos públicos são fictícios. Estados remotos, API, autenticação, paginação server-side e importações exigem implementação explícita posterior.

## Templates de aplicativo — v0.5

32. Consulte `docs/design-system/TEMPLATES.md` antes de alterar navegação e layouts de domínio.
33. Templates do app ficam em `apps/web/src/pages`, e primitives reaproveitáveis permanecem em `packages/ui`.
34. A navegação demonstrativa atual é baseada em fragmentos hash e não representa autenticação ou autorização.
35. Jamais inferir que o saldo de contas corresponde ao resultado do mês.
36. Pagamento de fatura reduz dívida, não constitui consumo adicional; não somar fatura e lançamentos sem conciliação.
37. Não ligar templates a dados reais, bancos ou API sem aprovação explícita.
38. Testar cenários de contas, faturas, orçamentos e relatórios com `bigint` antes de promover versões.

## Complemento v0.5.1 — Semântica, gráficos e carregamento

39. Consulte `docs/design-system/CHARTS_AND_COLORS.md` antes de representar valores negativos, positivos ou séries temporais.
40. Use `finance-positive`/`finance-negative` para **resultado assinado**; `finance-income`/`finance-expense` para **natureza**. Transferência própria é terceira natureza.
41. Cores dos gráficos são tokens `chart-*`. Sempre mostre rótulos, valores e legendas; nunca use somente a cor.
42. Componentes `CashFlowChart`, `TrendLineChart` e `CategoryDonutChart` recebem valores monetários como bigint em centavos. Converta somente proporções limitadas para coordenadas CSS/SVG.
43. Para tabelas use `TableSkeleton`; para gráficos `ChartSkeleton`. Preserve estrutura visual e anuncie status com `role=status`, sem loops de loading artificiais em produção.
44. Não apresentar dados sintéticos como histórico bancário real.

## Consolidação Light/Dark

45. Use `apps/web/src/hooks/useTheme.ts` para configuração do tema no app; não duplique `matchMedia` ou acesso ao localStorage nos componentes.
46. Escopos CSS são `[data-theme="light"]` e `[data-theme="dark"]`. O modo system é resolvido antes de aplicar `data-theme`.
47. Sempre atualize os dois modos e confira a story `Foundations/Light & Dark` e os testes de contraste.
48. Não edite CSS gerado. Tokens têm fonte técnica exclusiva em `packages/tokens/src/themes.json`.
