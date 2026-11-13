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
| livro | `financial_accounts`, `transactions`, `transaction_links` |
| classificação | `categories`, `classification_rules`, `classification_feedback` |
| cartões | `credit_cards`, `card_statements`, `installments` |
| planejamento | `category_budgets`, `savings_boxes`, `savings_movements` |
| integração | `pluggy_connections`, `sync_runs`, `webhook_events` |

As tabelas são criadas na etapa que as utiliza. O grupo `livro`, as categorias e a base de cartões foram entregues na Etapa 2; `category_budgets` foi entregue na Etapa 3. Veja [`LEDGER.md`](LEDGER.md) e [`BUDGETS.md`](BUDGETS.md). Os demais grupos permanecem planejados.

## Execução das migrations

As migrations são aplicadas no projeto Supabase hospedado. Esta máquina não possui Docker, portanto o fluxo local (`supabase start`, `supabase db reset` e `supabase test db`) não faz parte da validação corrente.

O seed não contém usuário ou senha. Cadastro público e cadastro anônimo permanecem desativados. O provisionamento do proprietário e as validações disponíveis estão em [`AUTH.md`](AUTH.md).
