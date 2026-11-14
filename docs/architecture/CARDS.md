# Cartões, faturas e parcelas

## Modelo

- `credit_cards` estende uma conta `credit_card` com fechamento, vencimento e limite opcional.
- `card_statements` identifica uma fatura pela competência do vencimento.
- `card_statement_entries` liga compras, estornos e pagamentos aos lançamentos imutáveis do livro.
- `card_installments` guarda parcelas realizadas (`posted`) e previsões (`projected`).

A compra é despesa no mês de vencimento da fatura. O pagamento é patrimonialmente neutro e apenas reduz o valor pendente. O estorno é positivo, mantém `reporting = expense` e reverte a compra por vínculo explícito.

## Materialização MeuPluggy

O staging privado preserva metadados de parcela, fatura e transação original. Uma transação de cartão só entra no livro quando fechamento e vencimento são conhecidos; a aplicação nunca usa o mês da compra como aproximação. A chave externa continua idempotente.

Ao importar uma compra parcelada, a parcela corrente é realizada e as competências seguintes são projetadas em `card_installments`. Projeções não criam `transactions`, não alteram o realizado e não podem sobrescrever uma parcela que depois foi efetivamente importada.

## Segurança e escrita

As tabelas derivadas têm RLS e leitura direta apenas para o proprietário. Configuração do cartão e associação de pagamento usam RPCs `security definer` com validação de propriedade. A sincronização escreve pelo backend; lançamentos MeuPluggy permanecem imutáveis.

Validação disponível sem Docker:

```bash
pnpm cards:check
pnpm --filter @personal-finance/domain test
pnpm test:auth
```

A execução real das constraints e políticas ainda deve ser confirmada no Supabase hospedado antes do uso com dados pessoais.
