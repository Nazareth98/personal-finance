# Corporate UI — ícones

O design system usa `lucide-react` por meio do componente `Icon` de `@personal-finance/ui`.

## Contrato

- tamanhos: `sm` 16 px, `md` 20 px e `lg` 24 px;
- traço fixo de 2 px e cor herdada de `currentColor`;
- ícone decorativo omite `label` e recebe `aria-hidden`;
- ícone que comunica informação isoladamente exige `label`;
- botões e links devem manter texto ou `aria-label`; o ícone não substitui o nome acessível;
- importar somente os ícones semânticos exportados pelo Corporate UI, preservando tree-shaking e consistência.

```tsx
import { Button, Icon, PlusIcon } from '@personal-finance/ui';

<Button><Icon icon={PlusIcon} size="sm" />Nova conta</Button>
```

Não use emojis, caracteres Unicode ou SVGs copiados para representar ações cobertas pelo catálogo.
