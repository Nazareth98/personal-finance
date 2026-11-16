# Preparação de deploy

## Fronteiras

O frontend é um build Vite estático em `apps/web/dist`. Somente `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` entram no build; ambas identificam a API pública protegida por RLS. Tokens de acesso da CLI, Service Role e credenciais MeuPluggy nunca pertencem ao frontend.

As Edge Functions, migrations e secrets permanecem no Supabase. Publicação remota exige autorização explícita e deve usar secrets do provedor de CI, sem arquivos versionados.

## Build do frontend

```bash
pnpm install
pnpm build
```

- diretório raiz do repositório;
- saída: `apps/web/dist`;
- Node.js 22.12+ e pnpm 10;
- roteamento por hash, portanto não depende de rewrite para as páginas internas;
- HTTPS obrigatório fora de `localhost` para instalação e service worker.

## Supabase

Antes do primeiro uso real, aplicar migrations em ordem, publicar as três Edge Functions MeuPluggy e configurar os secrets exclusivamente no backend. Em seguida, validar RLS com o usuário proprietário e atualizar as URLs autorizadas do Auth para o domínio final.

### Projeto novo — caminho das pedras

1. **Criar o projeto** no Dashboard do Supabase, na região mais próxima disponível. Guarde a senha do banco em um gerenciador de senhas; ela não entra no repositório.
2. **Anotar somente os identificadores públicos**: Project Ref, Project URL e Publishable Key. Não copiar `service_role` para a Vercel, arquivos `.env` ou documentação.
3. **Vincular o checkout**, na raiz do repositório:

   ```bash
   pnpm exec supabase login
   pnpm exec supabase link PROJECT_REF
   pnpm exec supabase migration list --remote
   pnpm exec supabase db push --dry-run --remote
   ```

   Revise se aparecem somente as migrations versionadas em `supabase/migrations`. Não use `db reset --remote` nem `--include-seed`.
4. **Aplicar o schema** somente após revisar o dry-run:

   ```bash
   pnpm exec supabase db push --remote
   pnpm exec supabase migration list --remote
   ```

5. **Configurar o Auth no Dashboard**: email/senha habilitado, cadastro público e login anônimo desabilitados, senha mínima de 12 caracteres. Não execute `config push` enquanto `supabase/config.toml` contiver URLs locais.
6. **Criar o único usuário** pelo painel administrativo e inserir seu UUID em `public.profiles` conforme [`AUTH.md`](AUTH.md). Confirme que não é possível criar um segundo `is_owner = true`.
7. **Cadastrar secrets das Edge Functions** no Dashboard, sem expô-los em histórico de shell:
   - `PLUGGY_CLIENT_ID`;
   - `PLUGGY_CLIENT_SECRET`;
   - `PLUGGY_WEBHOOK_SECRET`.

   `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são fornecidos pelo ambiente das Edge Functions; não os duplique como secrets manuais.
8. **Publicar as funções** no projeto vinculado:

   ```bash
   pnpm exec supabase functions deploy pluggy-connect-token
   pnpm exec supabase functions deploy pluggy-sync
   pnpm exec supabase functions deploy pluggy-webhook
   ```

   `pluggy-connect-token` e `pluggy-sync` exigem JWT. Somente `pluggy-webhook` usa `verify_jwt = false`, pois valida o segredo/HMAC do provedor.
9. **Configurar a Vercel** com Root Directory na raiz e com `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` em Preview e Production. Depois do primeiro deploy, copie o domínio HTTPS definitivo.
10. **Fechar o Auth**: defina o domínio da Vercel como Site URL e Redirect URL no Supabase, preservando `http://localhost:5173` apenas para desenvolvimento.
11. **Configurar o MeuPluggy** com o endpoint `https://PROJECT_REF.supabase.co/functions/v1/pluggy-webhook`. Antes de habilitar eventos reais, confirme no sandbox o formato de assinatura disponível e use o mesmo segredo configurado no backend.
12. **Executar o smoke test**: login do proprietário, rejeição de outra conta, conexão sintética MeuPluggy, primeira importação, repetição sem duplicidade, exibição dos três horários operacionais, logout e fallback offline sem dados financeiros.

Referências oficiais: [workflow local/remoto](https://supabase.com/docs/guides/local-development/cli-workflows), [deploy de Edge Functions](https://supabase.com/docs/guides/functions/deploy) e [CLI](https://supabase.com/docs/reference/cli/introduction).

## Vercel e automação

`vercel.json` define instalação congelada, build pela raiz e saída em `apps/web/dist`. No painel da Vercel, **Root Directory deve permanecer na raiz do repositório**, sem selecionar `apps/web`, pois o frontend depende dos pacotes do workspace.

Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` nos ambientes Production e Preview. `pnpm vercel:build` bloqueia o deploy quando elas faltam, a URL não usa HTTPS ou a chave aparenta ser Service Role. O service worker recebe `must-revalidate`; assets com hash recebem cache imutável.

O Git Integration da Vercel publica pushes da `main`. Os workflows do GitHub usam a mesma versão Node/pnpm e instalação congelada; o job de navegador também valida autenticação e PWA. O deploy do Supabase deve permanecer em um fluxo separado e protegido.

## PWA e privacidade

O service worker não intercepta `rest/v1`, `auth/v1`, `functions/v1`, hosts Supabase nem requisições com `Authorization`. Navegação offline recebe somente `offline.html`; nenhum livro, saldo, lançamento ou sessão é persistido para uso offline.
