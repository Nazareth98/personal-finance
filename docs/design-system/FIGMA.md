# Integração Figma ↔ GitHub ↔ Codex

Arquivo: [Corporate UI — Design System Foundations](https://www.figma.com/design/OrPxvoVcl2Esk0iXoufxYr).

Criado no Figma:
- `01 — Foundations`: cores primitivas, aliases de Light, escala geométrica e prancha.
- `02 — Dark Foundations`: cores Dark e tokens específicos para finanças.
- Coleções independentes `Corporate / Primitives`, `Corporate / Semantic Light`, `Corporate / Semantic Dark`, `Corporate / Geometry`.

**Limitação do Figma Starter:** o plano não permite múltiplos modos na mesma coleção. São coleções separadas em Figma e dois conjuntos de semânticos no JSON, unificados pelo mesmo nome na geração CSS.

## Contrato de sincronização

1. Alterações técnicas nas cores, espaçamentos e nomes começam em `packages/tokens/src/themes.json`.
2. Executar o gerador e revisar o CSS resultante.
3. Atualizar visualmente as duas pranchas e variáveis do Figma de acordo com o contrato.
4. Ao criar componentes, mapear propriedades e variantes: `Button / Variant / Size / State`; `Card`; `Badge / Tone`.
5. Registrar mudanças relevantes nas foundations em `FOUNDATIONS.md` e via PR.

A sincronização Figma↔GitHub ainda **não é automática**. A biblioteca Figma ainda não possui todos os componentes React, nem Code Connect. Isso é uma etapa futura; não presumir publicação de biblioteca nem vínculo automático.
