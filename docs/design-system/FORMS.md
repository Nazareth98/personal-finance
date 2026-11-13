# Corporate UI — Formulários v0.3

## Componentes disponíveis

| Componente | Contrato | Acessibilidade / comportamento |
| --- | --- | --- |
| `Input` | label obrigatório; hint, error e props HTML nativas | `label/htmlFor`, `aria-invalid`, `aria-describedby` |
| `Select` | options tipadas, placeholder, hint, error, controlled/uncontrolled | Usa `select` HTML nativo e keyboard behavior do navegador |
| `Checkbox` | label, hint, error, estados checked/disabled | `input type=checkbox`, label clicável |
| `RadioGroup` | legend, name, options, value/defaultValue, onChange | fieldset/legend, agrupamento e navegação nativa |
| `Field` | label/htmlFor, hint, error e children | Wrapper low-level; consumidores devem vincular descrições com IDs se necessário |
| `FormMessage` | hint, error, success | Erro com `role=alert` |
| `Button` | variantes/tamanhos + loading | loading desabilita o botão; `aria-busy` |
| `Dialog` | open/onClose/title/description/footer | HTML dialog modal nativo: foco, Escape e bloqueio de fundo |
| `ToastProvider` / `useToast` | notify/dismiss, tone, durationMs | success/info são `status`; error é `alert`; dispensável |

**Todos estão em Beta.** Storybook: `pnpm storybook`, com alternância Light/Dark.

## Exemplo financeiro

O dashboard inclui o botão **Nova movimentação (demo)**. Ele abre o formulário com:
- Tipo de operação: receita, despesa ou transferência própria;
- Valor no padrão BRL `123,45`, convertido diretamente em **centavos `bigint`**;
- Conta fictícia, descrição e confirmação de que não há gravação;
- Validação de campos e toast indicando sucesso/erro de uma **simulação**.

Não existe persistência, conexão a banco, autenticação, importação bancária nem operações reais. A mensagem de sucesso diz explicitamente que nenhum lançamento foi gravado.

## Regras de implementação

1. Labels nunca são placeholders. Todo campo precisa de identificação programática.
2. Mensagens de erro devem aparecer junto aos campos e ser anunciadas para leitores de tela.
3. Prevenir submit duplicado em fluxos assíncronos com `loading`; evitar state falso de "salvo".
4. Exigir confirmação para ações destrutivas reais; dados reais não entram em Stories.
5. Usar `bigint`/inteiros em centavos na lógica de domínio. Não usar `parseFloat` para montantes.
6. Cores vêm de `packages/tokens/src/themes.json`, não de valores inline de componentes.
7. Em campos controlados, passar `value` e `onChange`; em não controlados, usar `defaultValue`.
8. Para erros em produção, integrar com schema validation e camada de formulário aprovada pelo projeto (por exemplo React Hook Form + Zod) sem substituir validações de servidor.
9. Validação client-side é UX, não mecanismo de segurança, autenticação ou integridade financeira.
10. Testar os estados Default, Disabled, Error e Loading, além de interações de teclado e foco.

## Critérios para sair de Beta

- Testes de interação por componente (Testing Library / Playwright);
- revisão de contraste e foco Light/Dark com ferramentas automatizadas e revisão humana;
- Storybook e UI com build verde;
- API do componente estável;
- contrato equivalente e variantes documentadas no Figma.

## Referência visual Figma

Os componentes Input, Select, Checkbox, RadioGroup, Dialog e Toast possuem versões visuais editáveis na página `03 — Forms` do [arquivo Corporate UI](https://www.figma.com/design/OrPxvoVcl2Esk0iXoufxYr). Essas bases ainda não contêm todas as variantes e propriedades do React.
