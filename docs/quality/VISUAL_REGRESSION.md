# v0.6 — Baseline visual Light/Dark (Playwright)

## Matriz

São **36 snapshots de templates**, seis telas por três viewports (`mobile=390×844`, `tablet=768×1024`, `desktop=1440×900`) e por dois temas (`light`, `dark`). As capturas incluem a página inteira, dados fictícios, fuso horário fixo, `locale=pt-BR`, densidade de pixels 1 e animações desabilitadas.

- As capturas de referência residem em `apps/web/tests/e2e/__screenshots__/{projectName}/{page}.png`.
- `visual.spec.ts` compara screenshots com `toHaveScreenshot`, tolerando variações pequenas de antialiasing (`threshold=0.2`, `maxDiffPixelRatio=0.002`).
- **O primeiro baseline deve ser gerado apenas uma vez em um ambiente Linux conhecido e revisado**. Não atualizar os snapshots automaticamente em cada PR.
- `pnpm test:visual`: compara os 36 baselines versionados. `pnpm test:visual:update`: recria todos — usar apenas quando uma mudança visual foi analisada e aprovada.
- O workflow inicial gera os snapshots ausentes e os salva no GitHub pela conta de automação apenas na primeira execução em `main`; após essa inicialização, capturas divergentes falham e precisam ser revisadas.

## Diagnóstico

Artefatos do GitHub Actions incluem `playwright-report/`, `test-results/` e a pasta de screenshots quando houver falhas.

Se o baseline estiver ausente e o workflow não tiver permissão de escrita, ele falhará com instruções e disponibilizará as imagens como artefato. Nesse caso, revisar as imagens e versioná-las de forma explícita.

## Acessibilidade

`accessibility.spec.ts` usa axe-core para violações automatizáveis WCAG A/AA; ela **não certifica** acessibilidade completa. `behavior.spec.ts` verifica tema salvo, hash navigation e largura de layout no mobile.

## Execução local

```bash
pnpm install
pnpm build
pnpm exec playwright install --with-deps chromium
pnpm test:visual
pnpm test:e2e
pnpm test:a11y
```

É necessário usar ambiente Linux compatível com o CI para avaliar snapshots de maneira reproduzível. Recomenda-se validar visualmente cada baseline em Light/Dark antes de declarar o Design System Stable.

## Correção responsiva encontrada na primeira captura

O screenshot de Relatórios em 390px mostrou expansão horizontal do grid raiz. A correção define `minmax(0,1fr)` no breakpoint mobile e `min-width:0` nos contêineres dos templates, preservando rolagem local das tabelas.

Atualização **intencional** dos 36 baselines no CI Linux: somente um commit explícito na `main` com `[update visual baselines]` permite refazer e commitar automaticamente os arquivos; os demais commits verificam e falham em diferenças inesperadas.

## Ampliação v0.6.2 — estados de gráfico e tabela

Adicionados 24 baselines: `chart-loading`, `chart-error`, `table-loading`, `table-error`, cada um nos dois temas e três viewports. A matriz total passa a **60 screenshots**. Veja [ASYNC_STATES.md](ASYNC_STATES.md).
