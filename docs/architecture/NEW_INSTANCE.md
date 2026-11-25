# Nova instância (uma pessoa, um Supabase)

Cada pessoa usa a própria instância: um projeto Supabase, um projeto Vercel e a própria conta MeuPluggy. O código é o mesmo; nada pessoal fica no repositório (D-064, D-065).

Quem executa este roteiro é quem administra a instalação, com a pessoa dona das contas. Para autonomia e isolamento, prefira o fork na conta dela, com Supabase, Vercel e MeuPluggy próprios. Não reutilize o projeto Supabase nem as credenciais da instância existente. Para o passo a passo sem terminal, use [Comece aqui](../COMECE_AQUI.md).

## 1. Supabase

1. Crie um projeto no [Dashboard](https://supabase.com/dashboard), região São Paulo. Guarde a senha do banco num gerenciador de senhas.
2. Anote o **Project Ref** (Settings → General), a **Project URL** e a **Publishable Key** (Settings → API).
3. Gere um **Access Token** em Account → Access Tokens, na conta dona do projeto.

## 2. GitHub — publicar o backend sem terminal

O workflow [`supabase-deploy.yml`](../../.github/workflows/supabase-deploy.yml) aplica as migrations e publica as Edge Functions em cada instância listada.

1. Em Settings → Environments, crie um environment (ex.: `segunda-instancia`) com:
   - variável `SUPABASE_PROJECT_REF`;
   - secrets `SUPABASE_ACCESS_TOKEN` e `SUPABASE_DB_PASSWORD`.
2. Em Settings → Secrets and variables → Actions → Variables, defina `SUPABASE_ENVIRONMENTS` com todos os environments, em JSON: `["principal","segunda-instancia"]`.
3. Em Actions → **Supabase — publicar backend** → Run workflow. Confira o job `deploy` de cada environment: `plan` verde com deploy pulado não publica nada. Os próximos pushes na `main` publicam quando alteram os caminhos definidos no workflow (migrations, funções, configuração Supabase, código do domínio ou o próprio workflow).

### Instância em fork (recomendado para outra pessoa)

A pessoa faz um fork e configura nele um único environment (`producao`, com `SUPABASE_ENVIRONMENTS = ["producao"]`). O workflow [`fork-sync.yml`](../../.github/workflows/fork-sync.yml) roda só em forks, todo dia às 06:17 de Brasília: chama `merge-upstream` na `main`, e o push resultante dispara a publicação do backend e o deploy da Vercel da cópia (D-066).

- Precisa do secret de repositório `SYNC_TOKEN` no fork: token clássico de quem é dona do fork, com escopos `repo` e `workflow`. O `GITHUB_TOKEN` não pode atualizar arquivos de workflow nem disparar outros workflows.
- Evite commits próprios no fork: eles podem gerar conflitos no merge. O workflow não resolve conflitos automaticamente.
- Habilite o agendamento no fork e faça uma execução manual inicial. O horário pode atrasar; em repositórios públicos, 60 dias sem atividade desativam o agendamento. Veja as [regras do GitHub](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule). Tokens com validade precisam ser renovados.
- Os workflows de validação (design system e regressão visual) não rodam em forks.

O guia para quem não é técnico está em [`docs/COMECE_AQUI.md`](../COMECE_AQUI.md); há também uma versão visual interativa (artifact “Guia: seu Balanço”).

O histórico de migrations do projeto principal foi alinhado aos nomes dos arquivos em 21/11/2026; um projeto novo recebe todas em ordem.

## 3. Auth (no Dashboard da instância nova)

- Authentication → Sign In / Providers: e-mail com senha ligado; **Allow new users to sign up** desligado; login anônimo desligado; senha mínima de 12 caracteres.
- Authentication → URL Configuration: Site URL e Redirect URLs com o domínio da Vercel do passo 5.
- Não use `supabase config push`: o `config.toml` tem URLs locais.
- Teste o ciclo completo de recuperação de senha. O envio padrão restringe destinatários aos endereços autorizados da equipe; configure SMTP próprio quando necessário ([documentação](https://supabase.com/docs/guides/auth/auth-smtp)). A URL correta sozinha não garante entrega.

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
2. Informar o nome do titular (reconhece Pix entre as próprias contas), conectar os bancos, revisar lançamentos, configurar fechamento e vencimento dos cartões, criar caixinhas (inclusive para investimentos) e metas.

Cada pessoa usa a própria conta MeuPluggy; confira os limites vigentes na conta. Antes de considerar a entrega concluída, valide login, recuperação de senha, credenciais Pluggy, uma sincronização e o calendário dos cartões. Não registre dados reais em capturas ou issues.

A primeira sincronização importa todo o histórico disponível. O período de revisão pode ser escolhido e salvo no perfil; o [contrato de persistência](MEUPLUGGY.md#período-inicial-de-revisão) distingue esse recurso do corte de importação.

## O que não é automático

- Criar o projeto Supabase e o projeto Vercel, gerar o Access Token e criar o usuário: exigem login nas contas.
- Webhook do MeuPluggy: adiado; o app sincroniza ao abrir (D-061).
