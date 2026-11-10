# Meu Pluggy pessoal

## Escopo e limite de uso

A integração usa o conector pessoal Meu Pluggy exclusivamente para importar dados do proprietário do aplicativo. Não é um provedor Open Finance multiusuário, não conecta bancos em nome de usuários do produto e não deve ser habilitada para outras contas. A conta proprietária é fixada em `MEUPLUGGY_OWNER_USER_ID`; a Edge Function rejeita qualquer outra identidade autenticada. O uso depende dos termos vigentes do Meu Pluggy e da autorização do titular.

O titular conecta suas instituições na experiência Meu Pluggy e autoriza o conector MeuPluggy no Dashboard da Pluggy. O servidor usa apenas os `itemId` explicitamente configurados. Nunca aceitar credenciais bancárias, tokens ou item IDs livres do navegador.

## Configuração segura

Implantar a migration mais recente no Supabase remoto e publicar a função `meupluggy-api`. Não executar Supabase local como parte deste fluxo. Configurar somente nos secrets do Supabase Edge Functions:

- `PLUGGY_CLIENT_ID` e `PLUGGY_CLIENT_SECRET` obtidos no Dashboard;
- `MEUPLUGGY_OWNER_USER_ID`, UUID do usuário proprietário no Supabase Auth;
- `MEUPLUGGY_ITEM_IDS`, lista separada por vírgulas dos itens pessoais autorizados, máximo de cinco;
- `MEUPLUGGY_ALLOWED_ORIGINS`, origens exatas permitidas, separadas por vírgulas, por exemplo o domínio de produção e o preview explicitamente autorizado.

As credenciais Pluggy não pertencem a `.env`, `.env.example`, variáveis `VITE_*`, build do Pages ou navegador. Não usar curingas em origens CORS. Rotacionar secrets se houver exposição e retirar imediatamente um item revogado da allowlist.
O `client-id` e o `secret` são credenciais da aplicação Pluggy, não credenciais bancárias. A Edge Function envia ambos a `POST /auth`, recebe uma API key que expira em cerca de duas horas, mantém essa chave apenas em memória no servidor e a usa no cabeçalho `X-API-KEY`. Você não precisa gerar nem copiar a API key manualmente. O Client Secret só é exibido ao ser gerado; se não foi guardado, gere um novo no Dashboard e atualize os secrets da Edge Function (o anterior deixa de funcionar).

Para obter os itens pessoais, entre no Meu Pluggy e conecte seus bancos; no Dashboard Pluggy, em Aplicações → sua aplicação → Demo → Connect Account, escolha o conector `MeuPluggy` (não o banco individual nem Sandbox). Copie o `itemId` exibido em Connected Items. Repita para os bancos pessoais que deseja usar, respeitando o limite do serviço e o limite local de cinco itens.


## Conexão e sincronização

1. O titular conecta os bancos no Meu Pluggy e configura o conector MeuPluggy na aplicação Pluggy.
2. A operação de listar contas consulta apenas os itens da allowlist e confirma que o conector do item é MeuPluggy.
3. O titular mapeia explicitamente cada conta/cartão remoto a uma conta local do próprio workspace; tipos incompatíveis são recusados. Para cartões, primeiro cadastre uma conta financeira local do tipo crédito; a configuração de fechamento, vencimento e limite é feita separadamente em Contas e cartões.
4. A sincronização confere sessão, identidade proprietária, workspace, vínculo, item, conta remota, estado e validade do consentimento no servidor.
5. Transações usam `/v2/transactions` e paginação por cursor. Valores são convertidos em centavos exatos, IDs externos estáveis evitam reimportação e novos itens seguem para a fila de revisão humana.
6. Revogar marca primeiro os vínculos locais como revogados; depois solicita a exclusão remota do item. Se a operação remota falhar, o acesso local permanece revogado e o titular recebe a orientação de removê-lo no Dashboard. O item revogado deixa de ser consultado e suas contas não aparecem como sincronizáveis.

O Meu Pluggy não oferece renovação por esta API. A autorização deve ser renovada pelo titular no Dashboard; se for criado um novo `itemId`, atualizar a allowlist e vincular o novo item. Sincronização não renova consentimento. Importação CSV, OFX, QFX, XLSX e PDF continua disponível e compartilha a deduplicação por identificador externo e a revisão humana.

## Dados e isolamento

Cada mapeamento referencia conta e workspace próprios. RPCs validam `my_workspace()` e não concedem acesso a service role no browser. As credenciais da Pluggy e a allowlist permanecem somente nos secrets do backend. O limite owner-only protege os dados do conector pessoal mesmo que outro usuário conheça o endpoint ou um `itemId`.

As migrations antigas ainda usam nomes internos `open_finance_*` para preservar histórico e compatibilidade de restauração. A API de snapshot da aplicação expõe `meupluggy_connections`; backups anteriores com `open_finance_connections` são traduzidos na restauração. Registros antigos de mock são revogados, e RPCs de mock e do adaptador Pluggy anterior têm execução revogada.

## Cobertura e limites

A cobertura de cada instituição, produto (conta/cartão) e período histórico precisa ser confirmada na própria conta Meu Pluggy antes de depender dos dados. O aplicativo não promete cobertura de Itaú, Nubank ou Caixa. Não existe renovação automática, webhook ou sincronização agendada nesta implementação. O fluxo está pendente de implantação e homologação no Supabase real; não declarar produção validada antes das verificações em [DEPLOY_VALIDATION.md](DEPLOY_VALIDATION.md).

Referências oficiais:
- [Meu Pluggy — uso pessoal e limites](https://docs.pluggy.ai/en/docs/guides/meu-pluggy-personal-use)
- [Transações com paginação por cursor](https://v1.docs.pluggy.ai/reference/transactions-list-by-cursor)
- [Listagem de contas](https://docs.pluggy.ai/en/reference/account/accounts-list)
- [Exclusão de item e consentimento](https://docs.pluggy.ai/docs/consent-management-delete-an-item)
