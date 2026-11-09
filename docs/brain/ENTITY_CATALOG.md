# Catálogo de entidades implementadas

Migrations são fonte estrutural. IDs UUID; timestamps UTC; UI pt-BR e data de negócio America/Sao_Paulo. Exemplos sintéticos.

| Entidade | Campos e invariantes | Relacionamentos |
|---|---|---|
| profiles | id PK, display_name até 100 caracteres, locale pt-BR, timezone, deletion_requested_at, created_at | id → auth.users; leitura/edição próprias |
| workspaces | id PK, owner_id UNIQUE, name, kind=personal, created_at | owner → auth.users; criado no trigger |
| workspace_members | workspace_id PK, user_id UNIQUE, role=owner | FK composta ao proprietário; sem escrita do cliente |
| storage.objects | bucket financial-files privado; caminho workspace/arquivo; máximo 10 MiB | associação do usuário; proíbe traversal |

Entidades financeiras/provedores são acrescentados com migrations e fluxos correspondentes. Nenhuma proposta é declarada persistida antes disso.
