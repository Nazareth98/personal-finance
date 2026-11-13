# Testes de estados assíncronos — v0.6 (erros, gráficos e loading)

## Contrato de estados

- `DataState` aceita `status: 'success' | 'loading' | 'error'`, `kind: 'chart' | 'table'`, conteúdo `children`, rótulo de loading e opção de retry.
- `loading`: exibe `ChartSkeleton` ou `TableSkeleton` com `role="status"`, `aria-busy="true"`; não expõe valores temporariamente obsoletos.
- `error`: exibe `ErrorState` com `role="alert"`, título/descrição e botão **Tentar novamente** quando `onRetry` existe.
- `success`: renderiza o conteúdo sem wrapper visual adicional; gráficos ainda gerenciam seu `EmptyState` quando não têm dados.
- `onRetry` é um callback do consumidor: na demo apenas restaura dados sintéticos. Na integração real, iniciar nova tentativa e mudar para loading antes de exibir sucesso.

## Regras de gráficos

- `CashFlowChart`: recebe magnitudes em `bigint` centavos; zero continua valor válido, sem conversão financeira para float.
- `TrendLineChart`: resultados negativos e positivos são valores assinados; série constante não pode produzir `NaN`.
- `CategoryDonutChart`: entradas zero/negativas são omitidas e total vazio resulta em `EmptyState`; percentuais são apenas visuais.
- Em todos: legendas e valores textuais são obrigatórios, não apenas cor.

## Validação

```bash
pnpm test:states
pnpm test:states:visual
pnpm test:a11y
pnpm check
```

`states.spec.ts` verifica ciclos loading → erro → retry → sucesso, preservação de filtros e auditoria axe em estados não ideais.

`states-visual.spec.ts` acrescenta **24 snapshots** (quatro estados × três viewports × Light/Dark), que se somam aos 42 templates, totalizando **66 screenshots**. Todos são capturados em Chromium no Ubuntu 24.04.

A revisão visual dos diffs precisa ser consciente. A atualização de baseline em `main` exige a marca `[update visual baselines]` no commit. Os dados são somente fictícios, sem APIs externas. Testes em browser e axe automatizado não substituem navegação com leitores de tela ou aprovação manual WCAG.

## Revisão dos baselines

A expansão do catálogo visual e a inclusão de controles demonstrativos alteram os templates de Visão geral e Transações. O commit de atualização da matriz utiliza a marca `[update visual baselines]` para regenerar e versionar as capturas no runner Linux. Não aceitar atualizações de imagens automaticamente em mudanças futuras sem revisão de conteúdo.
