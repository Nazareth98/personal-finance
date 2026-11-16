# Integração MeuPluggy

## Fronteiras

- `pluggy-connect-token`: exige sessão do proprietário e devolve somente um Connect Token efêmero.
- `pluggy-sync`: exige sessão do proprietário; cria/retoma uma execução e importa o Item informado.
- `pluggy-webhook`: não usa JWT do usuário. Exige `PLUGGY_WEBHOOK_SECRET`, registra o evento e responde `202` antes do processamento em background.
- `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET`, `PLUGGY_WEBHOOK_SECRET` e `SUPABASE_SERVICE_ROLE_KEY` existem somente nas Edge Functions.
- O navegador lê `pluggy_connections` e `sync_runs` por RLS, sem permissão de escrita.

O webhook aceita HMAC-SHA256 do corpo em `x-pluggy-signature` (hex ou base64) ou um segredo direto em `x-pluggy-webhook-secret`/Bearer quando houver um gateway que injete esse cabeçalho. Nunca colocar o segredo na URL. A configuração real deve ser confirmada com o mecanismo disponível na conta MeuPluggy antes do deploy.

## Persistência e idempotência

- `public.pluggy_connections`: um registro por `owner_id + item_id`, com `last_source_updated_at` vindo de `Item.lastUpdatedAt`, tentativa, sucesso e erro sanitizado.
- `public.sync_runs`: histórico e checkpoint por conta/página; apenas uma execução pode ficar ativa por conexão.
- `private.webhook_events`: inbox durável com `provider_event_id` único. Evento duplicado recebe `202` sem novo processamento.
- `private.pluggy_accounts`: vínculo entre Account do provedor e `financial_accounts`.
- `private.pluggy_transactions`: staging imutável com chave externa única.
- `public.transactions.external_key`: `pluggy:<transactionId>`, também único por proprietário.

Importações repetidas usam `ON CONFLICT DO NOTHING`. Uma falha mantém tudo já confirmado; a próxima execução recebe trigger `resume`, percorre novamente a janela segura e ignora as chaves existentes. Incrementos reabrem três dias antes do último sucesso para capturar atrasos sem duplicar.

## Semântica financeira

Valores do provedor são convertidos imediatamente para `bigint` em centavos. Categoria explícita de transferência ou pagamento de fatura produz efeito neutro; os demais créditos/débitos bancários entram sem categoria para a Etapa 6.

Transações de cartão são preservadas no staging, mas ainda não entram no livro. A competência correta depende da fatura e será materializada na Etapa 7. Isso evita registrar compra no mês errado e mantém o payload disponível sem alterar um lançamento importado depois.

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

- confirmar o mecanismo de assinatura/cabeçalho oferecido pela conta MeuPluggy;
- validar o contrato do SDK Connect e o formato do callback de sucesso;
- aplicar migration e testar RLS no Supabase hospedado;
- confirmar paginação e limites com Items sintéticos/sandbox;
- registrar os webhooks habilitados e o comportamento de retentativa do provedor.
