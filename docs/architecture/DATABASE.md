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

As tabelas serão criadas na etapa que as utiliza. Não antecipar o modelo completo em uma migration única.

## Acesso local

1. Copie `.env.example` para `.env` e preencha apenas valores locais.
2. Execute `pnpm supabase:start`.
3. Crie o usuário proprietário pelo Supabase Studio local ou pela API administrativa local.
4. Execute `pnpm supabase:reset` para recriar o banco a partir das migrations.
5. Execute `pnpm supabase:test` para validar grants e RLS.

O seed não contém usuário ou senha. Cadastro público e cadastro anônimo permanecem desativados.
