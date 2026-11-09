# Plano e evidências de teste

- npm run typecheck, npm run lint, npm test, npm run build: obrigatórios por fase.
- npm run test:security: cria banco PostgreSQL descartável, aplica migrations e usa roles anon/authenticated e duas identidades sintéticas. Testa provisionamento, leitura agregada, alteração de dono/membership e Storage cruzado/traversal. Auth e Storage são schemas mínimos para teste SQL, não substituem e2e dos serviços Supabase.
- Login, confirmação de e-mail e recuperação devem ser homologados em Supabase local/completo ou destino; teste SQL não comprova entrega de e-mail.
- Nenhuma fixture contém dados históricos pessoais.
