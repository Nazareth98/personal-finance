# Nova instância (uma pessoa, um Supabase)

Cada pessoa usa a própria instância: um projeto Supabase, um projeto Vercel e a própria conta MeuPluggy. O código é o mesmo; nada pessoal fica no repositório (D-064, D-065).

Quem executa este roteiro é quem administra o código. A pessoa que vai usar o app só participa no último passo.

## 1. Supabase

1. Crie um projeto no [Dashboard](https://supabase.com/dashboard), região São Paulo. Guarde a senha do banco num gerenciador de senhas.
2. Anote o **Project Ref** (Settings → General), a **Project URL** e a **Publishable Key** (Settings → API).
3. Gere um **Access Token** em Account → Access Tokens, na conta dona do projeto.

## 2. GitHub — publicar o backend sem terminal

O workflow [`supabase-deploy.yml`](../../.github/workflows/supabase-deploy.yml) aplica as migrations e publica as Edge Functions em cada instância listada.

1. Em Settings → Environments, crie um environment (ex.: `esposa`) com:
   - variável `SUPABASE_PROJECT_REF`;
   - secrets `SUPABASE_ACCESS_TOKEN` e `SUPABASE_DB_PASSWORD`.
2. Em Settings → Secrets and variables → Actions → Variables, defina `SUPABASE_ENVIRONMENTS` com todos os environments, em JSON: `["principal","esposa"]`.
3. Em Actions → **Supabase — publicar backend** → Run workflow. Daí em diante, todo push na `main` que mude `supabase/` ou `packages/domain` publica nas instâncias.

Se a instância for um fork em vez do mesmo repositório, faça o mesmo no fork com um único environment.

O histórico de migrations do projeto principal foi alinhado aos nomes dos arquivos em 21/11/2026; um projeto novo recebe todas em ordem.

## 3. Auth (no Dashboard da instância nova)

- Authentication → Sign In / Providers: e-mail com senha ligado; **Allow new users to sign up** desligado; login anônimo desligado; senha mínima de 12 caracteres.
- Authentication → URL Configuration: Site URL e Redirect URLs com o domínio da Vercel do passo 5.
- Não use `supabase config push`: o `config.toml` tem URLs locais.

## 4. Proprietário

Crie o usuário em Authentication → Users → Add user (e-mail e senha da pessoa) e, no SQL Editor:

```sql
insert into public.profiles (id, email, is_owner)
values ('UUID_DO_USUARIO', 'EMAIL_DA_PESSOA', true);
```

Só existe um proprietário por instância ([`AUTH.md`](AUTH.md)).

## 5. Vercel

Novo projeto importando o mesmo repositório, com as configurações de [`DEPLOYMENT.md`](DEPLOYMENT.md) (Node 22.x, saída `apps/web/dist`) e as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` da instância nova, em Production e Preview.

## 6. Entrega para a pessoa

Mande o endereço do app, o e-mail e a senha provisória. No primeiro acesso ela segue “Primeiros passos” dentro do app:

1. Conexões → **Conectar ao Pluggy**: o card explica como criar a conta no MeuPluggy, a aplicação no painel do Pluggy e onde copiar Client ID e Client Secret. O app testa as chaves e as guarda no Vault (D-064); não há secret para cadastrar no Supabase.
2. Conectar os bancos, revisar lançamentos, cartões, caixinhas e metas.

O plano gratuito do MeuPluggy é de uso pessoal (até 5 conexões); cada pessoa usa a própria conta.

## O que não é automático

- Criar o projeto Supabase e o projeto Vercel, gerar o Access Token e criar o usuário: exigem login nas contas.
- Webhook do MeuPluggy: adiado; o app sincroniza ao abrir (D-061).
