# Corporate UI — contrato unificado de temas (consolidação v0.5.2)

## Regra única

**Fonte técnica:** `packages/tokens/src/themes.json`. Tokens semânticos Light e Dark devem expor exatamente as mesmas chaves. O CSS é gerado em `packages/tokens/dist/theme.css` e nunca editado à mão.

- `html[data-theme="light"]`: modo claro explícito.
- `html[data-theme="dark"]`: modo escuro explícito.
- Preferência `system`: acompanha `matchMedia('(prefers-color-scheme: dark)')`, atualiza ao mudar o SO.
- `localStorage['pf-theme']` persiste `light`, `dark` ou `system`. Valores antigos `light` e `dark` continuam válidos.
- Na ausência de preferência salva ou com storage indisponível, o padrão é `system`.
- Um script curto no `<head>` aplica o tema antes da renderização React, evitando flash do tema errado.
- O hook `useTheme` sincroniza escolha manual, alterações do SO, outras abas e `color-scheme` nativo (inputs/scrollbars).
- O gerador permite escopo **por contêiner**: `[data-theme="light"]` e `[data-theme="dark"]`; isso possibilita stories lado a lado sem duplicar CSS.

## Componentes e conformidade

1. Componentes devem utilizar `--color-*` gerados, nunca literais hexadecimais.
2. Cores financeiras continuam com semânticas independentes: **natureza** (`finance-income`, `finance-expense`, `finance-transfer`) e **resultado assinado** (`finance-positive`, `finance-negative`, `finance-neutral`).
3. Gráficos utilizam `chart-*` e exibem informações textuais; cor isolada não transmite valor.
4. Cada alteração deve validar contraste textual >= 4,5:1 sobre `bg-canvas` e `bg-surface`, além dos pares críticos de ação e status.
5. Storybook: `Foundations/Light & Dark` é o comparativo de contêineres. A toolbar global também alterna Light/Dark.
6. O modo `system` é recurso da aplicação; Storybook usa modos explícitos para tornar testes reproduzíveis.

## Quality gate

```bash
pnpm tokens:check
pnpm test
pnpm typecheck
pnpm build
pnpm storybook:build
```

Testes de contrato verificam paridade de tokens, pares de contraste financeiros e CSS gerado para ambos os temas. Auditoria real WCAG com leitores de tela e visual regression permanecem no escopo da v0.6.

## Figma Starter

Figma usa duas coleções separadas, `Corporate / Semantic Light` e `Corporate / Semantic Dark`, porque o plano Starter limita modos na mesma coleção. O JSON no GitHub continua sendo a fonte técnica única. A sincronização Figma↔código **não é automática**.

## Ajustes encontrados nos testes axe-core

- `text-secondary` no Light foi ajustado para `#5B6B82` para manter 4,5:1 em `bg-subtle`.
- `text-accent` é independente de `action-primary`: Light `#1D4ED8` e Dark `#93C5FD`. A cor de botão não deve ser reutilizada automaticamente para texto.
- O componente de notificações passou a utilizar região nomeada semanticamente.

Mudanças visuais exigem atualização intencional dos baselines via GitHub Actions, acompanhada de nova verificação de contraste.
