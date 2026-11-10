# Open Finance — implementação e limites

Adaptador TypeScript `OpenFinanceProvider` oferece intenção, autorização, sincronização, renovação, revogação e capacidades. Dois adaptadores estão disponíveis:
1. `PluggyOpenFinanceProvider` (provedor oficial Open Finance via Pluggy): consome tokens seguros de conexão, abre o widget oficial `react-pluggy-connect`, mapeia transações bancárias e de cartão com centavos exatos e submete à fila de revisão humana via `stage_import` (ADR-0005).
2. `MockOpenFinanceProvider`: chama RPCs autenticadas de simulação; preservado para desenvolvimento desacoplado e testes locais.

## Ciclo implementado com Pluggy

1. Seleção de conta local de destino e clique em "Conectar Instituição (Pluggy Connect)".
2. Obtenção do `connectToken` efêmero no backend (via dev proxy local ou Supabase Edge Function `pluggy-api`) sem exposição de chaves privadas ao frontend.
3. Abertura do modal seguro `react-pluggy-connect` onde o titular escolhe sua instituição (ou Pluggy Bank no sandbox) e autoriza o compartilhamento.
4. Conexão registrada no banco via RPC `pluggy_register_connection` vinculada ao workspace do titular com `pluggy_item_id`.
5. Sincronização automática inicial ou sob demanda: busca contas e transações da Pluggy, aplica `mapPluggyTransactions`, assegura idempotência via `pluggy:<transaction_id>`, e envia para `stage_import`.
6. Os lançamentos aguardam na fila de revisão humana antes da contabilização definitiva no livro diário (`transactions`).
7. Revogação remove o consentimento local e exclui o item correspondente na API da Pluggy.

## Ciclo do Mock

1. Conta local + instituição simulada + escopos → conexão pending e state aleatório privado, vinculado ao usuário, com 10 minutos de validade.
2. Confirmação explícita → state consumido uma única vez → consentimento active por 90 dias.
3. Sync manual → lock da conexão → validar dono/estado/prazo/escopo → uma página sintética → mesmo stage_import de arquivos → revisão humana → ledger.
4. Falha simulada registra código sanitizado, não avança cursor; retry manual seguro.
5. Renovação explícita conserva cursor e histórico. Revogação bloqueia sync e remove intenção pendente, preservando lançamentos.
