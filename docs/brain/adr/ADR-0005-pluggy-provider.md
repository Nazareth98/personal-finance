# ADR 0005 — Integração com Provedor Pluggy Open Finance

Aceita em 10/11/2026. Implementar adaptador `PluggyOpenFinanceProvider` em substituição progressiva ao mock para ingestão automatizada de transações de contas bancárias e cartões de crédito via Open Finance.

## Contexto e Motivação
A ADR-0003 estabeleceu um adaptador mock antes da contratação ou teste com provedores comerciais. Com a disponibilização de credenciais de acesso da plataforma Pluggy (clientId/clientSecret), torna-se viável implementar o adaptador oficial mantendo os mesmos princípios de segurança:
1. Segredos de API (`PLUGGY_CLIENT_ID` e `PLUGGY_CLIENT_SECRET`) permanecem estritamente no lado servidor (Edge Functions do Supabase) e nunca são expostos ao bundle Vite/frontend.
2. O frontend consome apenas um token efêmero de conexão (`connectToken`, expiração curta de ~30 min) gerado sob demanda para inicialização do widget seguro `react-pluggy-connect`.
3. Os dados de transações extraídos da Pluggy passam pelo mesmo pipeline rigoroso existente: mapeamento determinístico para `Proposal`, cálculo monetário em centavos exatos (`bigint` domain `cents`), geração de `source_key` (`pluggy:<transaction_id>`) para idempotência (R016), envio via `stage_import` e retenção na fila de revisão humana para aprovação explícita antes de contabilização no ledger de `transactions`.
4. As regras de sinal monetário diferenciam contas correntes/poupança (onde valores negativos são débitos/despesas e positivos são créditos/receitas) de cartões de crédito (onde débitos/compras são reportados positivos e pagamentos/estornos são reportados negativos).
5. O mock permanece disponível para testes sintéticos e desenvolvimento desacoplado.

