# Governança — Corporate UI

## Versões e fluxo

- **0.x Beta**: contratos e componentes podem sofrer mudanças incompatíveis documentadas.
- **1.0 Stable**: apenas após cobertura de interações, auditoria acessível, stories e documentação para a família principal de componentes.
- Conventional Commits: `feat(ui):`, `fix(tokens):`, `docs(design-system):`, `test(ui):`.
- `main` protegida pelo processo: criar branch `feat/*`, abrir PR, avaliar CI, revisar diff e fazer merge.
- Nunca fazer alterações de tokens sem comparar Light e Dark e revisar contraste de uso.

## Critérios de aprovação (Definition of Done)

- `pnpm tokens:check`: nomes dos tokens equivalentes nos dois temas, cores válidas, valores geométricos válidos e contrastes de pares de texto essenciais (>= 4.5:1).
- `pnpm test`: testes unitários de contrato de tokens.
- `pnpm typecheck`: tipos React e UI sem erros.
- `pnpm build`: geração de CSS + build Vite.
- `pnpm storybook:build`: documentação compilável.
- Exigir revisão humana das imagens reais, interações, estados e componentes semânticos antes de declarar WCAG AA completo.
- `pnpm check` executa os comandos acima em sequência.
- GitHub Actions verifica PR e `main`; sem resultado verde, não recomendar merge.

## Política de design tokens

- JSON versionado: `packages/tokens/src/themes.json`.
- Mudanças no JSON exigem documentação e adaptação dos componentes consumidores.
- Figma é a representação visual, não fonte técnica automatizada. Novos tokens devem ser replicados nas páginas Light e Dark do Figma.
- Não usar cores genéricas "verde para positivo" sem verificar o papel semântico e contraste. Transferência própria é neutra no domínio.

## Privacidade

Dados fictícios exclusivamente em Storybook, documentação, screenshots, testes e CI. Sem credenciais, extratos, CPF, holerites e valores reais em GitHub.
