# Open Finance — implementação e limites

Adaptador TypeScript `OpenFinanceProvider` oferece intenção, autorização, sincronização, renovação, revogação e capacidades. `MockOpenFinanceProvider` chama RPCs autenticadas; toda posse e transição são verificadas no PostgreSQL. A factory rejeita qualquer código diferente de mock. Não há chave comercial, scraping ou pagamento.

## Ciclo implementado

1. Conta local + instituição simulada + escopos → conexão pending e state aleatório privado, vinculado ao usuário, com 10 minutos de validade.
2. Confirmação explícita → state consumido uma única vez → consentimento active por 90 dias.
3. Sync manual → lock da conexão → validar dono/estado/prazo/escopo → uma página sintética → mesmo stage_import de arquivos → revisão humana → ledger.
4. Falha simulada registra código sanitizado, não avança cursor; retry manual seguro. São três páginas determinísticas de janeiro/2026.
5. Renovação explícita conserva cursor e histórico. Revogação bloqueia sync e remove intenção pendente, preservando lançamentos. Prazo também é checado dentro do sync, independentemente do status da UI.

Locks serializam sync e revogação. Após o commit da revogação, uma chamada atrasada não ingere dados. Reprocessamento preserva decisões; origens têm chave por instituição/conta/evento. Mudança de conexão não cria outra compra ao aprovar o mesmo ID forte.

Faturas completas não estão disponíveis no mock; a UI declara a limitação e direciona para arquivos. Caixa usa cenário de cobertura parcial. Essa simulação não prova cobertura real.

## Integração real ainda bloqueada

Um adaptador futuro deve rodar no backend, usar secret manager, contrato válido, escopos e consentimento reais. Estado/PKCE e callback devem seguir protocolo do provedor. Webhook público não existe: antes de criá-lo, exigir verificação de assinatura específica, anti-replay, idempotência, fila e lookup de conexão para workspace exclusivamente no servidor. Não implementar uma assinatura genérica e apresentá-la como compatível com Pluggy/Belvo.

Não há agendamento pago, retry automático, limites comerciais configurados ou alegação de sandbox comercial contratado. A interface pode evoluir quando API escolhida for validada. Exportação contém metadados/consentimentos sem state privado; nunca credenciais bancárias.
