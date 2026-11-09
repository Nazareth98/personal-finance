# ADR 0004 — Restauração aditiva e detalhes financeiros

Aceita em 09/11/2026.

Restauração JSON é exclusiva do workspace original, com prévia e confirmação. Insere somente registros ausentes; conflito em um ID interrompe a transação inteira. Nenhum registro existente é substituído. Verifica autor, workspace, tipos, chaves compostas e invariantes contábeis. Conexões recuperadas ficam revogadas, exigindo novo consentimento. Intenções privadas nunca são exportadas. Recuperação de projeto/Auth apagado exige dump operacional, pois o JSON não recria identidade.

Faturas armazenam o total declarado e vinculam pagamentos ao livro. Consumo e saldo são derivados das transações; a diferença entre total declarado e itens é exibida, sem correção automática. Planejamento parcelado distribui centavos exatos: quociente inteiro e resto nas primeiras parcelas. Planejar não produz consumo; confirmar ou vincular ocorrência é uma operação explícita e idempotente.

Rubricas/bases detalham o holerite sem criar receita. Reclassificação preserva categoria/subcategoria anterior em eventos. Passivos de empréstimo têm perna de caixa positiva e obrigação negativa. Constraint diferida exige pares patrimoniais consistentes mesmo em restauração.

IDs de cadastros só são gerados pelo servidor; grants por coluna impedem sondagem por UUID escolhido ou alteração de workspace. Tipos de conta são imutáveis. Estado do livro só muda por RPC auditada. Supabase CLI fixada em 3.1.0: email usa `auth.email.enabled` e permissão de cadastro usa `auth.enable_signup`, conferidos no template gerado pela própria CLI.

Complemento: migration 007 usa PK `(workspace_id,id)` em todo dado financeiro. Uma restauração pode preservar um UUID já utilizado em outro workspace sem colidir, evitando inferência por erro de unicidade. Intenções privadas também carregam workspace; revogação e consumo de state continuam restritos ao usuário. Teste com UUIDs idênticos A/B comprova independência e preservação da autorização de A após revogação de B.

Migrations 008–009 completam a fronteira de ingestão e exportação: validar propostas no banco além do parser, preservar linha original privada e incluir metadados próprios do perfil. CSV serve para relatório (texto de fórmula neutralizado, centavos preservados); JSON é o formato de restauração. Por instrução do titular, não executar Supabase local: a homologação completa será no ambiente real, sem substituir as evidências SQL/sintéticas por alegações de integração executada.
