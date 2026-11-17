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

## Diagnóstico da importação real

O contrato oficial foi validado em 17/11/2026:

- contas `CREDIT/CREDIT_CARD` são listadas junto às demais contas do Item;
- compras, estornos e pagamentos vêm de `GET /v2/transactions?accountId=...`, com cursor; não existe uma rota separada obrigatória para compras;
- `creditCardMetadata.billId` associa uma transação à fatura quando disponível;
- `GET /bills` fornece totais, vencimento, encargos e pagamentos, mas não substitui as transações que compõem a fatura;
- compras chegam como `type=DEBIT` e pagamentos/estornos como `type=CREDIT`; o sinal monetário do cartão precisa ser convertido para o domínio;
- Open Finance pode devolver `balanceCloseDate = null`, portanto a primeira passagem pode guardar o dado no staging antes de existir calendário suficiente para materializá-lo;
- incrementos devem usar `createdAtFrom` e webhooks, pois uma compra antiga pode ser criada ou atualizada depois do seu dia de ocorrência.

A inspeção remota por agregados confirmou que as transações de cartão chegaram ao staging privado, inclusive com vínculos de fatura e metadados de parcelas, mas nenhuma havia sido materializada no livro das contas de crédito. O problema está no replay/materialização local, não na ausência dos gastos no provedor.

Próximos incrementos:

1. **Replay idempotente:** publicar o sincronizador corrigido e reler o histórico disponível das contas de crédito, reutilizando o staging e as chaves externas existentes.
2. **Materialização:** vincular o cartão, determinar fechamento/vencimento, criar a fatura e suas entradas; manter em staging com motivo explícito quando o calendário estiver incompleto.
3. **Conciliação:** comparar soma de compras, estornos e pagamentos com o valor da fatura, repetir a sincronização sem duplicar e auditar amostras antes de encerrar a Etapa 10.4.
4. **Estabilidade entre ciclos:** persistir `providerId` quando disponível e tratar eventos de atualização/exclusão. O `id` do MeuPluggy continua sendo a chave idempotente; `providerId` é apenas o identificador adicional da instituição em conexões reguladas/Open Finance.

O contrato oficial atual informa que o MeuPluggy preserva seu `id` quando a instituição altera o identificador da transação. Alterações de status, categoria ou `billId` chegam em `transactions/updated`; exclusões chegam em `transactions/deleted` e podem ser temporárias. A primeira entrega de estabilidade persiste `providerId` sem substituir a chave existente nem editar os dados financeiros importados. O processamento dirigido desses dois eventos fica no incremento seguinte.

Aceite operacional: para uma fatura selecionada, o sistema explica seu valor por entradas importadas e mantém o pagamento separado e neutro. Nova sincronização não duplica nenhuma entrada.

Referências oficiais: [Transactions](https://docs.pluggy.ai/en/docs/products/transactions), [Credit Card Installments](https://v2.docs.pluggy.ai/en/docs/products/credit-card-installments), [Credit Card Bills](https://docs.pluggy.ai/en/docs/products/credit-card-bills) e [Accounts](https://docs.pluggy.ai/en/docs/products/accounts).

## Segurança e escrita

As tabelas derivadas têm RLS e leitura direta apenas para o proprietário. Configuração do cartão e associação de pagamento usam RPCs `security definer` com validação de propriedade. A sincronização escreve pelo backend; lançamentos MeuPluggy permanecem imutáveis.

Validação disponível sem Docker:

```bash
pnpm cards:check
pnpm --filter @personal-finance/domain test
pnpm test:auth
```

A execução real das constraints e políticas ainda deve ser confirmada no Supabase hospedado antes do uso com dados pessoais.
