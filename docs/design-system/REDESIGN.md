# Redesign com Claude Design

Briefing para cada rodada de redesign. Leia junto com [`DESIGN.md`](../../DESIGN.md), que é o contexto visual entregue ao Claude Design.

## Fontes

| Material | Origem | Observação |
| --- | --- | --- |
| Sistema visual | `DESIGN.md` | `pnpm design:check` falha se divergir de `packages/tokens/src/themes.json` |
| Tokens | `packages/tokens/src/themes.json` | cores Light/Dark, espaçamento, raios, tipografia, elevação e camadas |
| Telas atuais | `pnpm redesign:inventory` | 52 capturas em `output/redesign-inventory/` (fora do Git): 11 telas + diálogo × Light/Dark × desktop/mobile, mais a folha “Mais” no mobile, com dados fictícios |
| Componentes | Storybook (`pnpm storybook`) | catálogo de `@personal-finance/ui` |

Nunca envie ao Claude Design capturas com dados reais. As do inventário vêm do mock dos testes.

## Telas

| Tela | Função principal |
| --- | --- |
| Visão geral | período navegável, KPIs, fluxo, resultado acumulado, metas e compromissos de cartão |
| Transações | livro completo com busca, filtros e ordenação |
| Contas | saldos reconstruídos pelo livro |
| Cartões e faturas | ciclo, faturas, pagamentos e parcelas futuras |
| Orçamentos | tetos percentuais por categoria |
| Caixinhas | saldo, aportes e resgates |
| Categorias | identidade visual, arquivamento e reatribuição |
| Conexões | estado e sincronização do MeuPluggy |
| Revisão | pendências e histórico com versões anteriores |
| Relatórios | previsão de seis meses |

## Pontos já observados no inventário

- ~~No mobile, a navegação em grade ocupa cerca de 360 px antes do conteúdo.~~ Resolvido com a barra inferior (opção A do canvas “Navegação mobile”, D-031).
- ~~Tabelas largas rolam lateralmente no mobile.~~ Resolvido com a lista compacta (opção B do canvas “Tabelas no mobile”, D-032).
- ~~Detalhes textuais dos gráficos ficam longos com rótulos “(previsto)”.~~ Resolvido na Visão geral (D-033): “Ver valores”, rótulos curtos no eixo e previsto por textura.

## Restrições que o redesign não muda

- Português do Brasil, BRL, `bigint` em centavos e sinais `+`/`−` além da cor.
- Receita, despesa, transferência própria, pagamento de fatura, aporte e resgate continuam visualmente distintos.
- Cores novas entram primeiro em `themes.json`, nos dois temas, e passam por `pnpm tokens:check`; nada de hex inline.
- Teclado, foco visível, labels, contraste AA e alternativa textual para gráficos.
- Componentes genéricos em `packages/ui`; composições financeiras em `apps/web`.

## Ciclo por tela

1. Gerar o inventário e levar `DESIGN.md` e as capturas da tela ao Claude Design.
2. Aprovar a proposta; mudanças de token entram antes dos componentes.
3. Implementar, atualizar stories e testes e rodar `pnpm check` e as suítes E2E.
4. Gerar o inventário de novo para comparar antes e depois; atualizar os baselines no CI com `[update visual baselines]` somente após revisar.
