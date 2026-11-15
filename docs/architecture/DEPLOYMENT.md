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

## Automação

O provedor do frontend ainda será escolhido com o proprietário. Vercel pode conectar a `main` e executar o build acima; o deploy do Supabase deve permanecer em um job separado e protegido. Nenhuma configuração remota foi criada nesta etapa.

## PWA e privacidade

O service worker não intercepta `rest/v1`, `auth/v1`, `functions/v1`, hosts Supabase nem requisições com `Authorization`. Navegação offline recebe somente `offline.html`; nenhum livro, saldo, lançamento ou sessão é persistido para uso offline.
