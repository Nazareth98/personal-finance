# Operação e deploy

Node LTS >=22.12; npm ci, copiar .env.example para .env.local, configurar URL/chave pública Supabase, npm run dev. Aplicar migrations com Supabase CLI (supabase start local ou supabase db push para projeto configurado). Nunca usar service_role em VITE_*.

Verificações: npm run check, npm run test:security, npm run test:e2e. Testes SQL exigem PostgreSQL local com direito de criar banco descartável e TEST_PG_URL; padrão porta 55439. Não usar credenciais de produção.

Cloudflare Pages: build npm run build, saída dist, variáveis VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY; cadastrar domínio exato no Auth. Headers em public/_headers. Netlify/Vercel também podem hospedar dist, adaptando fallback de SPA e headers.

Custos consultados em 09/11/2026: [Supabase Free](https://supabase.com/pricing) sujeito a cotas; [backups](https://supabase.com/docs/guides/platform/backups) devem ser exportados pelo operador no Free; [Cloudflare Pages](https://developers.cloudflare.com/pages/platform/limits/) tem limites de build. Nenhuma contratação nem deploy remoto automático. Exportar com CLI db dump e guardar criptografado fora do repositório; testar restauração em projeto separado.
