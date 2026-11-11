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
| categories | name único no workspace, archived, budget_nature opcional, sort_order | 1:N subcategorias/regras/metas/movimentos |
| subcategories | name, category_id, sort_order, budget_nature opcional | FK composta `(workspace_id, category_id)` à categoria; nome único dentro da categoria |
| categorization_rules | keyword literal, priority, active, match_mode=contains_literal, requires_financial_nature_review, source_key; automação opcional por account_id, amount_direction, transaction_nature, counterpart_account_id e auto_approve | FKs compostas, contas do mesmo workspace e chave fonte única; regras antigas não automatizam por padrão |
| credit_cards | account_id único, closing_day/due_day 1..31, limit_cents, last_four | configuração de conta de cartão |
| budget_allocations | period no primeiro dia, cadence monthly/annual, fixed_cents XOR percentage_bps, forecast_income_cents | categoria; UNIQUE categoria/período/cadência |
| savings_goals | account_id único, name, target_cents positivo, deadline | saldo derivado da conta de investimento |
| payslips | competence, employer, earnings/deductions/advance/net_cents | proventos-descontos-adiantamento=líquido; 1:N créditos |
| transactions | account/category/subcategory/related/payslip IDs, description, amount_cents, nature, event_date, bank_date, competence, status, source/source_key, installment_index/count, created_by/at | fonte contábil única; FK entre pares; chave idempotente por conta |
| import_batches | account_id, file_hash, parser_version, created_by/at | UNIQUE workspace/conta/hash |
| import_raw_rows | batch_id, row_index, proposal JSONB original, status, transaction_id, review_reason, automation_rule_id | índice de ocorrência evita fundir compras iguais; motivo explica a exceção |
| review_decisions | row_id, decision manual/automática, transaction_id, automation_rule_id, decision_reason, actor_user_id, created_at | eventos imutáveis |
| source_links | account_id, transaction_id, source_key | UNIQUE workspace/conta/chave |
| audit_events | entity, entity_id, action, actor_user_id, created_at | sem escrita direta; gerado por trigger |

Normalização adotada: income_entries, benefit_movements, savings_movements e installment_occurrences são movimentos tipados no livro; benefit_wallets são contas. Não existem cópias contábeis independentes. Compra parcelada completa, rubricas detalhadas e reconciliação de fatura serão ampliadas em migrations próprias, sem reinterpretar dados históricos.

## Conexão pessoal Meu Pluggy — migrations 003, 010 e 011

Migrations 003 e 010 são histórico de implementação, não capacidades ativas. Migration 011 revoga RPCs anteriores, encerra o mock e limita a conexão ao Meu Pluggy pessoal do proprietário. As tabelas abaixo mantêm nomes legados para compatibilidade de backup:

| Entidade interna legada | Campos e relações |
|---|---|
| open_finance_connections | id/workspace/account, provider_code histórico revogado ou `meupluggy`, instituição, status, scopes, expiração, última sync, item e conta Pluggy; FK composta à conta |
| open_finance_consents | trilha de autorização/revogação associada ao workspace e vínculo |
| open_finance_sync_runs | resultado de sync, lote, linhas recebidas e erro sanitizado |
| private.connection_intents | intenção legada sem grants ao cliente; RPCs antigas sem EXECUTE |

A API de snapshot expõe `meupluggy_connections`; novos fluxos não devem depender dos nomes internos `open_finance_*`. Vínculo é sempre validado por workspace e conta local. Webhooks, renovação automática e conexão para outros usuários não existem.

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

Migration 010 é histórico do adaptador Pluggy anterior; migration 011 revoga essas RPCs e habilita somente o fluxo pessoal Meu Pluggy, com conta e workspace validados, allowlist de itens no backend e staging idempotente na revisão humana.
