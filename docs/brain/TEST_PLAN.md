# Plano e evidências de teste

Importação privada (migrations 012 e 013): cobrir JSON malformado, campos/match mode não suportados, categoria/subcategoria inexistente, associação de naturezas conflitante, hash repetido, reimportação com linhas removidas e isolamento por workspace. Usar somente dados sintéticos. Homologar a RPC apenas no Supabase remoto; não iniciar Supabase local.

- npm run typecheck, npm run lint, npm test, npm run build: obrigatórios por fase.
- npm run test:security: cria banco PostgreSQL descartável, aplica migrations e usa roles anon/authenticated e duas identidades sintéticas. Testa provisionamento, leitura agregada, alteração de dono/membership e Storage cruzado/traversal. Auth e Storage são schemas mínimos para teste SQL, não substituem e2e dos serviços Supabase.
- Login, confirmação de e-mail e recuperação devem ser homologados no ambiente real, conforme instrução do proprietário; teste SQL não comprova entrega de e-mail. Não executar Supabase local.
- Nenhuma fixture contém dados históricos pessoais.

16 testes unitários passaram na etapa de domínio/importação: dinheiro exato, calendário, competência vs caixa, metas mensais/anuais, renda desconhecida, holerite, parcelas, estorno, regras literais, repetição legítima, CSV, OFX e PDF conservador. PostgreSQL: 72 verificações aprovadas, incluindo RLS de todas as tabelas financeiras, agregação/exportação, escrita cruzada por FK, importação/revisão com UUID de outro usuário, operação atômica e idempotência. Dependências de produção: npm audit sem vulnerabilidades após atualizar PDF.js e substituir ExcelJS.

A evidência histórica de testes antes da retirada do mock não valida o fluxo Meu Pluggy. A próxima execução autorizada dos testes deve cobrir isolamento owner-only, allowlist, expiração, paginação por cursor, deduplicação, revogação e restauração dos nomes de snapshot novos/legados. Não executar Supabase local; a homologação da Edge Function ocorre no Supabase remoto.

## Evidência atual — 09/11/2026

- 21 testes unitários, typecheck, lint e build aprovados.
- 195 verificações PostgreSQL 17 aprovadas: matriz SELECT/INSERT/UPDATE/DELETE em todas as tabelas, FKs cruzadas, agregados, exportação, consentimento, deduplicação, restauração com perda simulada, round-trip das entidades, classificação auditada, centavos de parcelamento, pagamento sem consumo duplo e passivo de empréstimo.
- 8 testes Playwright aprovados (desktop e Pixel 7): cadastro/recuperação, conta nova vazia, chamada de gravação, logout sem dados residuais, prévia de upload e confirmação antes de persistir, autenticação recusada. **Respostas HTTP são sintéticas nesses testes**; não comprovam GoTrue, PostgREST ou entrega de e-mail reais.
- Build verificado com configuração pública sintética para incluir as telas autenticadas no bundle; sem env o build apresenta somente orientação de configuração.
- npm audit: zero vulnerabilidades, inclusive desenvolvimento. Override minimatch 11.0.5 elimina advisory transitivo das ferramentas de lint; lint validado após alteração.
- CI executa Postgres descartável, geração de tipos sem drift, testes de navegador e auditoria. A execução de CI remoto depende de push; não foi alegada execução remota.

Não confundir PostgreSQL real com serviços Supabase completos: Auth/Storage são schemas mínimos no harness SQL. A homologação integrada continua pendente até a disponibilização do projeto real.

A migration 007 adicionou testes com IDs financeiros idênticos em workspaces diferentes: restauração independente, categoria preservada e revogação de B sem invalidar intenção de A. Total atual: 195 verificações PostgreSQL.

Concorrência real: duas conexões PostgreSQL competem pelo mesmo consentimento. Os testes verificam bloqueio por lock, revogação após sync em andamento e rejeição do sync enfileirado após revogação, sem novas linhas ingeridas.

Estado atual: 21 testes unitários e 195 verificações PostgreSQL. Adicionados rollback integral de lote inválido, calendário/competência/parcelas na ingestão, rejeição de perfil cruzado na restauração, preservação da linha original e CSV sem perda de centavos ou execução de fórmulas. Supabase local não será executado; homologação integrada exclusivamente no ambiente real.
