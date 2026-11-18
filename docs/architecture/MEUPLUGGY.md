# Integração MeuPluggy

## Fronteiras

- `pluggy-connect-token`: exige sessão do proprietário e devolve somente um Connect Token efêmero.
- `pluggy-sync`: exige sessão do proprietário; cria/retoma uma execução e importa o Item informado.
- `pluggy-webhook`: não usa JWT do usuário. Exige `PLUGGY_WEBHOOK_SECRET`, registra o evento e responde `202` antes do processamento em background.
- `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET`, `PLUGGY_WEBHOOK_SECRET` e `SUPABASE_SERVICE_ROLE_KEY` existem somente nas Edge Functions.
- O navegador lê `pluggy_connections` e `sync_runs` por RLS, sem permissão de escrita.

O webhook MeuPluggy deve ser criado pela API com `X-Pluggy-Webhook-Secret: <segredo>` em `headers`, usando o mesmo valor de `PLUGGY_WEBHOOK_SECRET` do Supabase. O endpoint também aceita HMAC-SHA256 do corpo em `x-pluggy-signature` (hex ou base64) ou Bearer para gateways compatíveis. Nunca colocar o segredo na URL.

## Persistência e idempotência

- `public.pluggy_connections`: um registro por `owner_id + item_id`, com `last_source_updated_at` vindo de `Item.lastUpdatedAt`, tentativa, sucesso e erro sanitizado.
- `public.sync_runs`: histórico e checkpoint por conta/página; apenas uma execução pode ficar ativa por conexão.
- `private.webhook_events`: inbox durável com `provider_event_id` único. Evento duplicado recebe `202` sem novo processamento.
- `private.pluggy_accounts`: vínculo entre Account do provedor e `financial_accounts`.
- `private.pluggy_transactions`: staging imutável com chave externa única.
- `public.transactions.external_key`: `pluggy:<transactionId>`, também único por proprietário.
- `private.pluggy_transactions.provider_id`: identificador opcional da instituição em conexões reguladas; complementa, mas nunca substitui, o `id` do MeuPluggy.

Importações repetidas preservam as chaves existentes sem duplicar o livro. Uma falha mantém tudo já confirmado; a próxima execução recebe trigger `resume`, percorre novamente a janela segura e ignora as chaves existentes. Incrementos reabrem três dias antes do último sucesso para capturar atrasos sem duplicar.

No staging, um replay pode preencher `providerId` que antes estava ausente sem alterar descrição, valor ou data. O contador de importados continua medindo somente novas linhas. `transactions/updated` relê os IDs informados em lotes de até 500 e atualiza metadados mutáveis. `transactions/deleted` marca staging e livro como removidos na origem; o mesmo `id` limpa essa marca ao reaparecer. Releitura por data não substitui esses eventos.

Transações usam `GET /v2/transactions`, `createdAtFrom` nos incrementos e o cursor `next` devolvido pelo Pluggy. O endpoint legado paginado `GET /transactions` não é aceito por aplicações novas. Consultas internas com listas de chaves são divididas em lotes para não exceder o tamanho seguro de URL do PostgREST.

## Semântica financeira

Valores do provedor são convertidos imediatamente para `bigint` em centavos. Categoria explícita de pagamento de fatura pode produzir efeito neutro quando compatível com conta, sinal e descrição. Categoria “transferência” ou “PIX” não prova transferência própria: débitos/créditos permanecem despesa/receita até existir evidência positiva de titularidade ou conciliação entre contas próprias.

Descrições explícitas de resgate/aporte associadas a cofrinho, caixinha ou reserva produzem `savings_withdrawal`/`savings_contribution` somente quando o sinal é compatível. Sinal ou evidência ambígua permanece receita/despesa para revisão.

No ambiente real observado, `GET /v2/transactions` entregou também as compras que compõem as faturas e elas foram preservadas no staging privado. O defeito estava na materialização: a primeira passagem podia não ter calendário completo, e os incrementos seguintes filtravam pela data da movimentação sem reler o histórico do cartão. Contas bancárias passam a usar `createdAtFrom`; contas de crédito relêem o histórico disponível para promover o staging idempotentemente após a configuração do calendário. O fluxo detalhado está em [`CARDS.md`](CARDS.md).

## Operação

Secrets obrigatórios:

```text
PLUGGY_CLIENT_ID
PLUGGY_CLIENT_SECRET
PLUGGY_WEBHOOK_SECRET
```

Após aplicar a migration `202611140001_meupluggy.sql`, publicar as três Edge Functions. O endpoint do webhook é `/functions/v1/pluggy-webhook`; `verify_jwt = false` vale somente para ele, pois sua autenticação é o segredo/HMAC específico.

“Sincronizar agora” busca o dado mais recente disponível no MeuPluggy. Não promete iniciar nova coleta na instituição. Erros persistem sem descrição, valor, token ou identificador bancário em logs apresentados ao usuário. A tela distingue a última atualização da fonte no MeuPluggy, a tentativa local de importação e o último sucesso local.

## Validação pendente no ambiente real

- configurar o mesmo `PLUGGY_WEBHOOK_SECRET` no Supabase e em `X-Pluggy-Webhook-Secret` no webhook criado pela API MeuPluggy; sem o secret, a função responde `503 webhook_not_configured`;
- validar o contrato do SDK Connect e o formato do callback de sucesso;
- registrar os webhooks `transactions/created`, `transactions/updated` e `transactions/deleted` e confirmar o comportamento de retentativa do provedor.
