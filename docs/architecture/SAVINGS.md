# Caixinhas

## Modelo

- `savings_boxes`: nome, saldo inicial, meta e data-alvo opcional.
- `savings_movements`: aporte ou resgate vinculado de forma única a um lançamento do livro.

O saldo não é armazenado separadamente:

```text
saldo = saldo inicial + aportes vinculados - resgates vinculados
```

`amount_cents` do movimento é sempre positivo. O tipo define o sinal no saldo. A meta e todo cálculo financeiro permanecem em `bigint`.

## Escrita e segurança

- `create_savings_box` cadastra a caixinha.
- `create_savings_movement` cria atomicamente um lançamento manual neutro e o movimento vinculado.
- `link_savings_movement` associa somente um lançamento MeuPluggy já importado, neutro e ainda não vinculado.
- aporte reduz a conta e resgate aumenta a conta; nenhum dos dois compõe renda ou consumo.
- resgate acima do saldo reconstruído é rejeitado.
- o navegador possui apenas leitura direta, protegida por RLS; escritas usam funções autenticadas.

Não há sugestão automática nesta etapa. Uma associação indistinguível exige escolha manual; evidências históricas para sugestões pertencem às etapas de integração e categorização.

A migration é [`202611130005_savings_boxes.sql`](../../supabase/migrations/202611130005_savings_boxes.sql).

## Aplicação sem Docker

```bash
pnpm savings:check
pnpm --filter @personal-finance/domain test
pnpm test:auth
pnpm check
```

A migration deve ser aplicada no Supabase hospedado antes do uso com dados reais.
