# Contrato inicial do banco

## Fronteiras

- `public`: somente tabelas e funções que podem ser alcançadas pela Data API, sempre com grants explícitos e RLS.
- `private`: processamento interno, filas e helpers não expostos ao navegador.
- `auth`: gerenciado pelo Supabase; referências usam apenas a chave primária de `auth.users`.

Novos objetos em `public` não concedem privilégios automaticamente a `anon` ou `authenticated`. Cada migration deve declarar grants, políticas por operação e índices usados pelas políticas.

## Entidades planejadas

| Grupo | Entidades |
| --- | --- |
| acesso | `profiles` |
| livro | `financial_accounts`, `transactions`, `transaction_semantic_overrides`, `transaction_links` |
| classificação | `categories`, `classification_rules`, `transaction_classifications`, `classification_feedback` |
| cartões | `credit_cards`, `card_statements`, `card_statement_entries`, `card_installments` |
| planejamento | `category_budgets`, `savings_boxes`, `savings_movements` |
| integração | `pluggy_connections`, `sync_runs`, `webhook_events` |

As tabelas são criadas na etapa que as utiliza. O grupo `livro` e as categorias foram entregues na Etapa 2; `category_budgets`, na Etapa 3; caixinhas, na Etapa 4; integração, na Etapa 5; categorização, na Etapa 6; faturas, entradas e parcelas, na Etapa 7. A Etapa 8 reutiliza os overlays e entidades existentes para calcular a previsão sem persistir valores futuros como realizados. Veja [`LEDGER.md`](LEDGER.md), [`BUDGETS.md`](BUDGETS.md), [`SAVINGS.md`](SAVINGS.md), [`MEUPLUGGY.md`](MEUPLUGGY.md), [`CATEGORIZATION.md`](CATEGORIZATION.md), [`CARDS.md`](CARDS.md) e [`FORECASTING.md`](FORECASTING.md).

`transaction_semantic_overrides` está planejada para a Etapa 10. Ela registra a natureza efetiva confirmada sem alterar o lançamento importado e deve ser aplicada antes do overlay de categoria na leitura do livro.

## Execução das migrations

As migrations são aplicadas no projeto Supabase hospedado. Esta máquina não possui Docker, portanto o fluxo local (`supabase start`, `supabase db reset` e `supabase test db`) não faz parte da validação corrente.

O seed não contém usuário ou senha. Cadastro público e cadastro anônimo permanecem desativados. O provisionamento do proprietário e as validações disponíveis estão em [`AUTH.md`](AUTH.md).
