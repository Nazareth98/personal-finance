# Metas por categoria

## Modelo

`category_budgets` guarda um percentual por proprietário e categoria de despesa. O percentual usa pontos-base inteiros (`1` = `0,01%`, `10000` = `100%`) e só pode ser alterado pela função autenticada `set_category_budget`.

O navegador possui leitura direta protegida por RLS. Escritas diretas permanecem revogadas. A migration é [`202611130004_category_budgets.sql`](../../supabase/migrations/202611130004_category_budgets.sql).

## Cálculo

Para o mês ou ano selecionado:

```text
teto em centavos = receita confirmada em centavos × pontos-base ÷ 10000
```

Receitas e despesas com classificação `confirmed` ou `automatic` entram no cálculo. Transferências e demais movimentos neutros ficam fora. O saldo mensal não migra para o mês seguinte; a visão anual recalcula usando apenas as movimentações daquele ano.

- abaixo de 80%: dentro do teto;
- de 80% até 100%: próximo do teto;
- acima de 100%: teto excedido.

Todo cálculo financeiro permanece em `bigint`; conversão para `number` ocorre somente no percentual visual limitado da barra de progresso.

## Aplicação sem Docker

```bash
pnpm budgets:check
pnpm --filter @personal-finance/domain test
pnpm test:auth
pnpm check
```

A migration deve ser aplicada no Supabase hospedado antes de usar a tela com dados reais.
