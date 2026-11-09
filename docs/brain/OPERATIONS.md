# Operação e deploy

Node LTS 24 recomendado (mínimo técnico 22.13); npm ci, copiar .env.example para .env.local, configurar URL/chave pública Supabase, npm run dev. Supabase CLI 3.1.0 fixada em devDependencies. **Não iniciar Supabase local**, por instrução do proprietário. Para o projeto real explicitamente escolhido, revisar migrations e seguir [a homologação](DEPLOY_VALIDATION.md). Nunca usar service_role em VITE_*.

Verificações: npm run check, npm run test:security, npm run test:e2e. Testes SQL exigem PostgreSQL local com direito de criar banco descartável e TEST_PG_URL; padrão porta 55439. Não usar credenciais de produção.

Cloudflare Pages: build npm run build, saída dist, variáveis VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY; cadastrar domínio exato no Auth. Headers em public/_headers. Netlify/Vercel também podem hospedar dist, adaptando fallback de SPA e headers.

Custos consultados em 09/11/2026: [Supabase Free](https://supabase.com/pricing) sujeito a cotas; [backups](https://supabase.com/docs/guides/platform/backups) devem ser exportados pelo operador no Free; [Cloudflare Pages](https://developers.cloudflare.com/pages/platform/limits/) tem limites de build. Nenhuma contratação nem deploy remoto automático. Exportar com CLI db dump e guardar criptografado fora do repositório; testar restauração em projeto separado.

## Backup e restauração

Perfil e backup → exportar JSON completo do workspace. O download contém dados sensíveis sem cifra automática: proteger localmente e não commitar. Restauração exige o mesmo workspace e ator, oferece contagens, recusa conflitos e grava atomicamente somente linhas ausentes. Conexões restauradas ficam revogadas. Estado privado de autorização não é exportado. Dump de PostgreSQL é necessário para recuperar identidade/projeto apagados; JSON não recria usuários Auth.

Restauração testada apagando exclusivamente dados sintéticos do banco aleatório criado pelo harness, recuperando todas as entidades e repetindo sem duplicar. Não reproduzir a simulação de perda em base real. Exclusão definitiva de conta continua operacional: confirmar identidade, oferecer exportação, revogar conexões, remover arquivos do prefixo privado e só então tratar a identidade/retencão conforme política aprovada. A UI registra solicitação; não executa esse procedimento automaticamente.

## Configuração e diagnóstico

- CLI 3.1.0: auth.enable_signup e auth.email.enabled. A configuração foi revisada contra o template dessa versão; isso não comprova o funcionamento dos serviços integrados. Não iniciar Supabase local para repetir a revisão.
- Telemetria da CLI pode ser desativada com SUPABASE_TELEMETRY_DISABLED=1 e DO_NOT_TRACK=1. Para execução isolada, SUPABASE_HOME pode apontar para pasta temporária; isso não altera variáveis gerais HOME.
- No ambiente real, configurar SMTP, verificar confirmação/reset e validar rate limits. O teste de navegador mock não comprova entrega de mensagens. Não executar Auth/Supabase local para homologação.
- Windows: se o encerramento automático do servidor do Playwright ficar preso, inicie Vite separadamente na porta 5179 com variáveis públicas sintéticas de teste e use PLAYWRIGHT_EXTERNAL_SERVER=1. Encerre o servidor depois. Não usar env/usuários de produção.
- Build sem env gera tela de configuração; build para deploy precisa de URL/chave pública. Chave privilegiada causa erro de build. Headers CSP devem incluir domínio próprio do Supabase se houver domínio customizado; o padrão permite *.supabase.co.
- npm run types:generate usa o mesmo banco descartável e gera DatabaseRows a partir do catálogo real após migrations. CI acusa drift do arquivo gerado.
- O pipeline de CI usa PostgreSQL 17; o harness simula schemas auth/storage para testar SQL. GoTrue, PostgREST, Storage API e SMTP completos exigem homologação adicional.

Fontes: [configuração da CLI](https://supabase.com/docs/guides/local-development/cli/config), [testar fluxos Auth](https://supabase.com/docs/guides/auth/testing-auth-flows), [telemetria](https://supabase.com/docs/guides/local-development/cli/getting-started). Em caso de divergência entre documentação e configuração, validar com a versão fixada da CLI antes de alterar o projeto.
