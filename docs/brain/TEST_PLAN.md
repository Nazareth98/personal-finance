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

## Navegação e tema — 10/11/2026

- Tipos, lint, 21 testes unitários e build aprovados após a mudança da sidebar.
- 10 cenários Playwright aprovados com HTTP sintético, em perfis desktop e móvel. Execução local usou Chrome instalado e porta Vite 5188, por indisponibilidade do Chromium esperado pelo runner e ocupação da porta padrão. Nenhum Supabase local foi iniciado.
- Regressão cobre minimizar/expandir por teclado, largura 80/240 px, persistência após recarregar, alternância de tema, contraste mínimo de 4,5:1 no logout escuro, Escape com retorno de foco, navegação com rótulos no celular e ausência de overflow em 320 px na Visão geral e em Contas.
- Inspeção visual via Playwright CLI conferiu sidebar expandida/compacta no tema escuro e navegação móvel com dados fictícios. Esses resultados não validam Auth ou backend reais.

## Ajuda contextual — etapa 2, 10/11/2026

- Tipos, lint, 21 testes unitários e build aprovados; 12 cenários de navegador passaram no Chrome instalado com API simulada, incluindo perfis desktop e móvel.
- Piloto H04 verifica abertura por teclado, nome do diálogo, foco inicial, bloqueio do foco no fundo, fechamento por Escape e por botão, retorno ao acionador e ausência de chamadas de aprovação/importação ao consultar a ajuda.
- Inspeção visual por Playwright CLI em 320 px/tema escuro confirmou conteúdo visível e ausência de rolagem horizontal. Falta validar leitor de tela, demais combinações de contraste e aplicação em outras abas. Não foi iniciado Supabase local.

## Ajuda contextual — etapa 3, 10/11/2026

- Tipos, lint, 21 testes unitários e build aprovados. Suíte de 16 cenários de navegador passou em perfis desktop e móvel; depois da inclusão de ajuda nos cards individuais e do cabeçalho fixo, os seis cenários afetados foram repetidos com sucesso. A execução utilizou Chrome instalado, Vite e API sintética.
- Regressões verificam as ajudas das cinco abas prioritárias, retorno de foco, preservação do formulário ao abrir/fechar ajuda, ajuda em conta e revisão individuais e orientação sobre classificação e duplicidade. Um lote sintético com primeira resposta bem-sucedida e segunda falha verifica a contagem confirmada, o alerta de resultado incerto e a atualização da fila.
- Inspeção visual via Playwright CLI em 320 px/tema escuro conferiu o painel longo de revisão, sem overflow horizontal, com título e botão de fechar visíveis ao rolar. Leitor de tela, demais combinações de contraste e integração com Supabase real continuam pendentes. Nenhum Supabase local foi iniciado.

## Ajuda contextual — etapa 4, 10/11/2026

- Tipos, lint, 21 testes unitários e build aprovados. Os 18 cenários de navegador passaram no Chrome instalado em desktop e Pixel 7, com Vite e API HTTP sintética; após incluir cards sintéticos de objetivo e holerite, o cenário alterado foi repetido nos dois perfis com sucesso.
- A regressão percorre H01–H30: acesso, navegação/período, indicadores, contas e próximos passos, orçamentos, caixinhas, holerites/rubricas, perfil, backup/restauração e exclusão, além da jornada prioritária. Confere que consultar ajuda não chama restauração nem alteração de perfil.
- Textos críticos verificados: aporte não é renda nem despesa, holerite não cria receita e restauração adiciona somente registros ausentes. A inspeção visual via Playwright CLI conferiu a ajuda de acesso em viewport móvel, com foco visível, conteúdo completo e sem corte horizontal.
- Supabase local não foi iniciado. Auth, RLS, restauração e integrações reais permanecem para homologação remota; leitor de tela e auditoria completa de contraste seguem pendentes para a etapa 6.
