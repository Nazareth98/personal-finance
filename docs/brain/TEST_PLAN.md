# Plano e evidências de teste

- npm run typecheck, npm run lint, npm test, npm run build: obrigatórios por fase.
- npm run test:security: cria banco PostgreSQL descartável, aplica migrations e usa roles anon/authenticated e duas identidades sintéticas. Testa provisionamento, leitura agregada, alteração de dono/membership e Storage cruzado/traversal. Auth e Storage são schemas mínimos para teste SQL, não substituem e2e dos serviços Supabase.
- Login, confirmação de e-mail e recuperação devem ser homologados em Supabase local/completo ou destino; teste SQL não comprova entrega de e-mail.
- Nenhuma fixture contém dados históricos pessoais.

16 testes unitários passaram na etapa de domínio/importação: dinheiro exato, calendário, competência vs caixa, metas mensais/anuais, renda desconhecida, holerite, parcelas, estorno, regras literais, repetição legítima, CSV, OFX e PDF conservador. PostgreSQL: 72 verificações aprovadas, incluindo RLS de todas as tabelas financeiras, agregação/exportação, escrita cruzada por FK, importação/revisão com UUID de outro usuário, operação atômica e idempotência. Dependências de produção: npm audit sem vulnerabilidades após atualizar PDF.js e substituir ExcelJS.

Após mock: 18 testes unitários e 94 verificações PostgreSQL. Incluem state errado/reutilizado, isolamento de consentimento, sync antes de autorização, revogação, expiração, renovação, falha sem avançar cursor, vínculo manual/mock sem nova despesa e rejeição de adaptadores comerciais.
