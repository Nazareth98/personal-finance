# ADR 0006 — Meu Pluggy pessoal e owner-only

Aceita em 10/11/2026. O único fluxo bancário automatizado permitido é a conexão pessoal Meu Pluggy do proprietário. Não há conexão Open Finance multiusuário nem adaptação comercial Pluggy.

## Decisão

- Fixar a identidade do titular em `MEUPLUGGY_OWNER_USER_ID`; Edge Function valida JWT e rejeita todas as outras identidades.
- Credenciais e lista de no máximo cinco `itemId` ficam somente em secrets de backend; aceitar somente itens cujo conector é MeuPluggy.
- Vincular contas remotas explicitamente a contas do mesmo workspace, com validação de tipo no banco.
- Importar por `/v2/transactions` com cursor, centavos exatos, chave externa estável, deduplicação e revisão humana.
- Revogar primeiro o vínculo local e então solicitar exclusão remota. Renovar autorização somente pelo Dashboard.
- Preservar importadores manuais para todos os usuários e manter migrations/tabelas legadas somente por compatibilidade de histórico/backup.

## Consequências

O fluxo exige secrets, allowlist e consentimento configurados pelo titular; não é elegível para os workspaces dos demais usuários. Não há sync automático nem promessa de cobertura bancária. A homologação precisa ocorrer no Supabase remoto, sem usar dados de terceiros. Ver [MEUPLUGGY.md](../MEUPLUGGY.md).
