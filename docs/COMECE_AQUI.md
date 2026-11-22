# Comece aqui: o seu Balanço em 6 etapas

Para quem nunca mexeu com nada disso. Você vai criar quatro contas gratuitas e ligar uma na outra: é só seguir os passos, copiar e colar. Leva cerca de uma hora; faça no computador.

| Peça | O que é | Para que serve |
| --- | --- | --- |
| **GitHub** | A planta da casa | Guarda o código. Você faz uma cópia sua, que se atualiza sozinha todo dia. |
| **Supabase** | O cofre | Guarda seus lançamentos, contas e o seu login. Só você entra. |
| **Vercel** | O endereço | Coloca o app no ar, com um link para o computador e o celular. |
| **MeuPluggy** | A ponte com os bancos | Busca extratos e faturas com a sua autorização. O app só lê, nunca movimenta dinheiro. |

Tenha à mão um gerenciador de senhas (ou um lugar seguro) para guardar três coisas: a senha do banco de dados, o Access Token do Supabase e a chave de atualização do GitHub.

> Os nomes dos botões estão em inglês porque é assim que aparecem nesses sites.

## 1. GitHub: sua cópia do app (~10 min)

1. Crie sua conta em [github.com/signup](https://github.com/signup). O plano gratuito basta.
2. Abra [o projeto](https://github.com/Nazareth98/personal-finance) e clique em **Fork** (canto superior direito) › **Create fork**.
3. Na sua cópia, abra a aba **Actions** e clique em **I understand my workflows, go ahead and enable them**.

## 2. Supabase: o cofre (~10 min)

1. Em [supabase.com/dashboard](https://supabase.com/dashboard), entre com **Continue with GitHub**.
2. **New project**:
   - **Project name**: `minhas-financas`
   - **Database Password**: **Generate a password**, copie e guarde.
   - **Region**: South America (São Paulo)

   Clique em **Create new project** e espere uns 2 minutos.
3. Anote o **Project ID**: ⚙ **Project Settings** › **General**. São umas 20 letras minúsculas.
4. Anote a **Publishable key**: ⚙ **Project Settings** › **API Keys**. Começa com `sb_publishable_`.
5. Gere um **Access Token**: sua foto › **Account preferences** › **Access Tokens** › **Generate new token** (nome “github”). Copie e guarde: aparece uma vez só.

O endereço do seu cofre é `https://SEU_PROJECT_ID.supabase.co`.

## 3. Ligar o GitHub ao cofre (~15 min)

Tudo na **sua cópia** do projeto no GitHub. Os nomes precisam ser exatamente estes.

1. **Settings** › **Environments** › **New environment**: `producao` › **Configure environment**.
2. Em **Environment secrets**, **Add environment secret** duas vezes:
   - `SUPABASE_ACCESS_TOKEN` = o Access Token da etapa 2
   - `SUPABASE_DB_PASSWORD` = a senha do banco da etapa 2
3. Em **Environment variables**, **Add environment variable**:
   - `SUPABASE_PROJECT_REF` = o Project ID
4. **Settings** › **Secrets and variables** › **Actions** › aba **Variables** › **New repository variable**:
   - `SUPABASE_ENVIRONMENTS` = `["producao"]` (com colchetes e aspas)
5. Crie a chave de atualização automática: sua foto › **Settings** › **Developer settings** › **Personal access tokens** › **Tokens (classic)** › **Generate new token (classic)**. Note: “sincronizar financas”; Expiration: **No expiration**; marque só **repo** e **workflow**. Copie (começa com `ghp_`).
6. **Settings** › **Secrets and variables** › **Actions** › aba **Secrets** › **New repository secret**:
   - `SYNC_TOKEN` = a chave `ghp_`
7. **Actions** › **Supabase — publicar backend** › **Run workflow**. Em 3 a 5 minutos deve aparecer um ✓ verde.

Deu ✗ vermelho? Quase sempre é um nome digitado diferente ou um valor colado com espaço. Confira os passos 2 a 4.

## 4. Seu login (~10 min)

No Supabase:

1. **Authentication** › **Sign In / Providers**: desligue **Allow new users to sign up** e salve. Se houver “Minimum password length”, coloque 12.
2. **Authentication** › **Users** › **Add user** › **Create new user**: seu e-mail, uma senha com 12 caracteres ou mais, marque **Auto Confirm User**.
3. Abra o usuário criado e copie o **User UID**.
4. **SQL Editor** › **+ New query**, cole o comando abaixo trocando os dois valores, e clique em **Run**:

   ```sql
   insert into public.profiles (id, email, is_owner)
   values ('COLE_O_USER_UID', 'SEU_EMAIL', true);
   ```

   A resposta esperada é “Success. No rows returned”.

## 5. Vercel: o app no ar (~10 min)

1. Em [vercel.com/signup](https://vercel.com/signup), plano **Hobby**, **Continue with GitHub**.
2. **Add New…** › **Project** › escolha `personal-finance` › **Import**. Se não aparecer, **Configure GitHub App** e dê acesso a ele. Não mude “Root Directory” nem o build.
3. Em **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL` = `https://SEU_PROJECT_ID.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = a Publishable key
4. **Deploy** e espere uns 3 minutos. Copie o endereço que termina em `.vercel.app`.
5. No Supabase, **Authentication** › **URL Configuration**: cole o endereço (com `https://`) em **Site URL**, salve e adicione o mesmo em **Redirect URLs**. Isso faz o “esqueci minha senha” funcionar.

## 6. Entrar e conectar os bancos (~15 min)

1. Abra o seu endereço `.vercel.app` e entre com o e-mail e a senha da etapa 4.
2. Crie sua conta no [MeuPluggy](https://meu.pluggy.ai) e conecte seus bancos (até 5, uso pessoal).
3. No [painel do Pluggy](https://dashboard.pluggy.ai), entre com o **mesmo e-mail e senha do MeuPluggy**, crie uma aplicação e copie **Client ID** e **Client Secret**.
4. No app: **Conexões** › **Conectar ao Pluggy** › cole as chaves › **Testar e salvar**. Depois, **Conectar instituição** para cada banco.
5. No celular: iPhone (Safari) › **Compartilhar** › **Adicionar à Tela de Início**; Android (Chrome) › **⋮** › **Instalar app**.

Contas correntes e cartões chegam sozinhos na primeira sincronização. A partir daí, siga “Primeiros passos” na Visão geral e use o botão **?** de cada tela.

> **Importante sobre cartões:** as compras de um cartão só aparecem depois que ele tem **dia de fechamento e dia de vencimento** da fatura. Alguns bancos já mandam essas datas; se um cartão aparecer em **Cartões** com “Configuração pendente”, toque em **Configurar** e informe os dois dias (estão na fatura ou no app do banco). Ao salvar, o app busca as compras na hora.

## Atualizações

Automáticas: todo dia, às 6h, sua cópia busca as novidades do projeto original e o app se atualiza. Para buscar na hora: **Actions** › **Sincronizar com o projeto original** › **Run workflow**. Não edite arquivos na sua cópia, senão ela deixa de se atualizar sozinha.

## Dúvidas comuns

- **Vou pagar alguma coisa?** Não. Os quatro serviços têm planos gratuitos que dão conta de uso pessoal.
- **Alguém além de mim vê meus dados?** Não. O cofre é seu, o cadastro fica fechado e só o seu usuário entra.
- **A sincronização falhou (recebi e-mail do GitHub).** Quase sempre é o `SYNC_TOKEN`. Gere outro (etapa 3, passo 5) e substitua o secret.
- **Perdi a senha do banco ou o Access Token.** Gere outros (senha: **Project Settings** › **Database** › **Reset database password**) e atualize os dois secrets da etapa 3.
- **O app ficou fora do ar depois de dias sem usar.** O plano gratuito do Supabase pausa projetos parados por uma semana. Entre no painel e clique em **Restore project**.
- **Travei.** Abra uma dúvida em [Issues](https://github.com/Nazareth98/personal-finance/issues) com um print da tela (sem senhas nem chaves).
