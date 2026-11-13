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
