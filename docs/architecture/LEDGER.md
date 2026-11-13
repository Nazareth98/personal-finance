# Livro financeiro

## Modelo

- `financial_accounts`: contas correntes, reservas, investimentos e a base dos cartões.
- `categories`: catálogo genérico versionado e somente leitura.
- `transactions`: livro único de lançamentos manuais ou importados.
- `transaction_links`: relaciona as duas pontas de transferências e ajustes aos registros originais.
- `credit_cards`: extensão mínima da conta; fechamento, faturas e parcelas pertencem à Etapa 7.

`amount_cents` é um `bigint` assinado: valor positivo aumenta o saldo da conta e negativo reduz. `reporting` define se o lançamento compõe receita, despesa ou é patrimonialmente neutro. Totais de resultado usam `reporting`; saldos usam diretamente o valor assinado.

## Escrita

- Contas são inseridas pelo proprietário e não podem ser alteradas ou excluídas pelo cliente.
- Lançamentos manuais usam `create_manual_transaction`.
- Transferências usam `create_manual_transfer`, que cria débito, crédito e vínculo na mesma transação PostgreSQL.
- Ajustes são novos lançamentos e exigem vínculo com o original; o registro corrigido não é alterado.
- O navegador tem somente leitura direta de `transactions` e `transaction_links`.
- Registros `source = 'pluggy'` são protegidos por trigger contra `UPDATE` e `DELETE`, inclusive no backend.

## Aplicação sem Docker

```bash
pnpm ledger:check
pnpm test:auth
pnpm check
```

Esses comandos validam o contrato estaticamente, os cálculos exatos e os fluxos do navegador com respostas sintéticas. Antes de inserir dados reais, aplique a migration `202611130003_financial_ledger.sql` no Supabase hospedado e confirme RLS, funções e triggers em um projeto sem dados pessoais.
