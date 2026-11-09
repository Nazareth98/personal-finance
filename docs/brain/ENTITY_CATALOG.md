# Catálogo de entidades implementadas

Migrations são fonte estrutural. IDs UUID; timestamps UTC; UI pt-BR e data de negócio America/Sao_Paulo. Exemplos sintéticos.

| Entidade | Campos e invariantes | Relacionamentos |
|---|---|---|
| profiles | id PK, display_name até 100 caracteres, locale pt-BR, timezone, deletion_requested_at, created_at | id → auth.users; leitura/edição próprias |
| workspaces | id PK, owner_id UNIQUE, name, kind=personal, created_at | owner → auth.users; criado no trigger |
| workspace_members | workspace_id PK, user_id UNIQUE, role=owner | FK composta ao proprietário; sem escrita do cliente |
| storage.objects | bucket financial-files privado; caminho workspace/arquivo; máximo 10 MiB | associação do usuário; proíbe traversal |

Entidades financeiras/provedores são acrescentados com migrations e fluxos correspondentes. Nenhuma proposta é declarada persistida antes disso.

## Livro e importação — migration 002

Todas as linhas têm `id UUID`, `workspace_id UUID NOT NULL`, UNIQUE(workspace_id,id), RLS e FKs compostas ao mesmo workspace. Valores são domínio `cents` sobre bigint (±9 trilhões por campo); RPC de exportação serializa centavos como string. Campos obrigatórios, CHECKs e índices completos estão no SQL versionado.

| Entidade | Campos específicos / invariantes | Relações |
|---|---|---|
| financial_accounts | name, institution, kind checking/cash/credit/benefit/savings/loan, opening_cents, BRL, archived | 1:N movimentos; saldo derivado |
| categories | name único no workspace, archived | 1:N subcategorias/regras/metas/movimentos |
| subcategories | name, category_id | FK composta `(workspace_id, category_id)` à categoria; nome único dentro da categoria |
| categorization_rules | keyword literal, priority int, active, category_id obrigatório, subcategory_id opcional | FKs compostas garantem que subcategoria pertence à mesma categoria e workspace |
| credit_cards | account_id único, closing_day/due_day 1..31, limit_cents, last_four | configuração de conta de cartão |
| budget_allocations | period no primeiro dia, cadence monthly/annual, fixed_cents XOR percentage_bps, forecast_income_cents | categoria; UNIQUE categoria/período/cadência |
| savings_goals | account_id único, name, target_cents positivo, deadline | saldo derivado da conta de investimento |
| payslips | competence, employer, earnings/deductions/advance/net_cents | proventos-descontos-adiantamento=líquido; 1:N créditos |
| transactions | account/category/subcategory/related/payslip IDs, description, amount_cents, nature, event_date, bank_date, competence, status, source/source_key, installment_index/count, created_by/at | fonte contábil única; FK entre pares; chave idempotente por conta |
| import_batches | account_id, file_hash, parser_version, created_by/at | UNIQUE workspace/conta/hash |
| import_raw_rows | batch_id, row_index, proposal JSONB original, status, transaction_id | índice de ocorrência evita fundir compras iguais |
| review_decisions | row_id, decision, transaction_id, actor_user_id, created_at | eventos imutáveis |
| source_links | account_id, transaction_id, source_key | UNIQUE workspace/conta/chave |
| audit_events | entity, entity_id, action, actor_user_id, created_at | sem escrita direta; gerado por trigger |

Normalização adotada: income_entries, benefit_movements, savings_movements e installment_occurrences são movimentos tipados no livro; benefit_wallets são contas. Não existem cópias contábeis independentes. Compra parcelada completa, rubricas detalhadas e reconciliação de fatura serão ampliadas em migrations próprias, sem reinterpretar dados históricos.

## Open Finance mock — migration 003

| Entidade | Campos e relações |
|---|---|
| open_finance_connections | id/workspace/account, provider_code=mock, institution, status, scopes[], expires_at, last_sync_at, cursor, created_at; FK composta à conta |
| open_finance_consents | id/workspace/connection, action authorize/renew/revoke, scopes[], expires_at, actor_user_id, created_at; histórico de consentimentos |
| open_finance_sync_runs | id/workspace/connection/batch, status success/error, rows_received, error_code sanitizado, created_at |
| private.connection_intents | connection_id PK, state UUID, user_id, expires_at; nenhum grant ao cliente, uso único |

Provedores/instituições são enums restringidos ao mock, sem tabela global editável. account_mappings está normalizado no vínculo conexão-conta nesta fase. Webhook_events não existe enquanto webhook de provedor real não for implementado.

## Detalhes financeiros — migrations 004–006

Mesmo padrão id/workspace, RLS e FK composta em todas as tabelas abaixo. Tipos completos gerados do PostgreSQL em `src/lib/database.types.ts` (incluindo nullability).

| Entidade | Campos e invariantes |
|---|---|
| billing_statements | account_id de cartão, competence, due_date, declared_cents >=0; único por conta/competência; total reconhecido derivado do ledger |
| billing_payments | statement_id, transaction_id único; valida saída de pagamento e contraparte no cartão correto |
| installment_purchases | account_id de cartão, category_id, description, event_date, first_competence, total_cents, installments 2..600; planejamento sem consumo |
| installment_occurrences | purchase_id, occurrence, competence, amount_cents positivo, transaction_id único opcional; soma das parcelas exata; vínculo validado por conta/valor/competência |
| payslip_items | payslip_id, code, description, kind earning/deduction/advance, amount_cents; não produz movimento |
| payslip_bases | payslip_id, name, amount_cents; bases informativas |
| transaction_classifications | transaction_id, previous/new_category_id, previous/new_subcategory_id, actor_user_id, created_at; histórico de classificação |

Migration 004 restringe grants por coluna e acrescenta restauração. Migration 005 inclui faturas, parcelamentos e rubricas. Migration 006 exige pares consistentes com constraint diferida, passivos de empréstimo e idempotência com validação de conteúdo. `source_links` também exige coerência da conta do lançamento. Nenhum total monetário é float.

Após migration 007, a PK efetiva de cada entidade financeira é `(workspace_id,id)`, preservando UUID como identificador local do registro. `private.connection_intents` inclui workspace_id derivado pelo backend, com PK composta workspace/connection. Essa regra substitui referências anteriores a ID globalmente único no domínio financeiro.

Migration 008 valida `import_raw_rows.proposal` no servidor; JSON pode conter original_row/original_text privados e imutáveis. Constraint relaciona status de revisão e transaction_id. Migration 009 inclui profile/workspace próprios no snapshot/exportação; restauração rejeita perfil/proprietário incompatíveis e preserva o perfil existente, conforme política aditiva.
