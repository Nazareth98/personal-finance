# Design System “Personal Finance” — referência obrigatória

**Fonte visual de toda interface do Balanço:** https://claude.ai/artifact/9AweKnLszsM8TkibsYZ29E

O artifact traz o brand book (`project/README.md`), os tokens (`project/tokens.json`), as decisões de design (`project/Decisoes.md`), os padrões (`project/Componentes-e-padroes.md`) e um README e uma prévia por componente (`project/components/<Comp>/`). Este arquivo é um resumo para consultar sem sair do repositório. Se os dois divergirem, vale o artifact. Corrija este resumo no mesmo trabalho.

Os tokens técnicos ficam em `packages/tokens/src/themes.json`, e os componentes em `packages/ui`.

## Como usar

1. Antes de mexer numa tela, leia o padrão e o README do componente no artifact.
2. Monte a tela com os componentes de `packages/ui`. Não use controle solto ou nativo sem estilo.
3. Criou ou mudou um padrão? Registre aqui e no artifact.

## Escolher o componente certo

| Situação | Use |
| --- | --- |
| Escolher entre opções que precisam de descrição, data, ícone ou valor | `VisualSelect` (ícone + rótulo + `description`) |
| Lista simples de rótulos curtos | `Select` |
| 2–3 opções curtas, todas visíveis (ex.: “Só este / Todos iguais”) | `RadioGroup` |
| Ação principal da área | `Button` `primary` (uma por área) |
| Ação de apoio | `Button` `secondary` |
| Ação discreta, link de navegação interna | `Button` `ghost` |
| Configuração da tela que muda pouco (período, escopo) | linha de contexto (abaixo), nunca um card grande |
| Formulário curto | `Dialog` com ações fixas no rodapé |

## Componentes e padrões (espelho do artifact)

### Botão (`Button`)
- **Variantes:** `primary` (uma por área), `secondary` (contorno), `ghost` (ações discretas, ícones).
- **Tamanhos:** `sm` 32 px, `md` 36 px, `lg` 44 px (botão principal de formulário e login).
- **Rótulo:** só o verbo (“Salvar”). Ícone + texto em ações de página (“+ Definir meta”).
- `loading` mostra progresso sem mudar a largura.

### Campo (`Input`, `Select`, `Field`)
- Rótulo acima. Obrigatório marcado com `*` em `status-danger`, fora do `<label>`.
- Altura 44 px, recuo 12 px, raio 8, borda `border-default`, foco `border-focus`.
- Dica abaixo, em `text-secondary` 12 px. Erro com ícone de alerta e texto, ligado por `aria-describedby`.
- `startText="R$"` para dinheiro e `endText="%"` para percentuais.
- `Select` sem aparência nativa: mesma caixa do input e seta própria.
- Data alinhada à esquerda.

### Seleção visual (`VisualSelect`)
- Opções com elemento visual (ícone, logo, cor), rótulo, `description` opcional (período, data, conta), `aside` (valor) e `badge`.
- `searchable` para listas longas.
- Usado em: ícone e cor da categoria, fatura do pagamento, período de revisão.

### Diálogo (`Dialog`)
- Cabeçalho (título, descrição, fechar) e barra de ações fixos. Só o corpo rola.
- Ações: secundária à esquerda, primária à direita.
- Até 680 px vira folha inferior, com as ações em colunas iguais.
- Confirmação destrutiva tem diálogo próprio, com a pergunta no título e o foco em Cancelar.

### Tabela e lista (`DataTable`, `Pagination`)
- No desktop, colunas, com valores à direita em `tabular-nums`. No celular, cards.
- Paginação “1–20 de 134”. “Por página” fica salvo por tabela.

### Filtros
- Botão de ícone `filter-toggle` da altura da busca, com contagem.
- Filtros ativos como chips removíveis. Estado na URL.

### Linha de contexto (D-080)
- Mostra uma configuração que vale para a tela inteira (ex.: “Revisando a partir de **01/10/2026** · 2 pendências anteriores”).
- Formato: uma linha com borda `border-default`, raio `radius-md` e fundo `bg-surface`. Ícone em `text-secondary`, o valor em destaque (`text-primary`, 600). Ações `sm` à direita: `ghost` para navegar e `secondary` para “Alterar”.
- No celular, as ações descem para a linha de baixo, alinhadas à direita.
- Implementação: `.review-period` em `apps/web/src/styles.css`.

### Cards de meta e caixinha
- Grupos por situação, com título e contagem. Card com identidade da categoria, valor de destaque, barra de progresso e percentual.

### Fatura do cartão
- O resumo vem primeiro. Pendência de pagamento oferece “Vincular pagamento” (`primary`) e “Marcar como paga” (`secondary`), lado a lado, e empilhados no celular.
- A lista de lançamentos fica recolhida em “Lançamentos · N”.

### Navegação
- Desktop: sidebar com marca, navegação, ação primária e menu da conta no rodapé.
- Celular (≤1000 px): barra inferior, cabeçalho com título, ajuda e menu da conta, e o botão flutuante “Nova movimentação”.

### Estados de dados (`DataState`)
- Carregando (skeleton), vazio (mensagem e ação), erro (mensagem e “Tentar novamente”), sucesso. Toasts para confirmações curtas.
