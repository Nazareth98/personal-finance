const urlValue = process.env.VITE_SUPABASE_URL?.trim();
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

if (!urlValue || !publishableKey) {
  console.error('Deploy bloqueado: configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY na Vercel.');
  process.exit(1);
}

let url;
try { url = new URL(urlValue); }
catch {
  console.error('Deploy bloqueado: VITE_SUPABASE_URL não é uma URL válida.');
  process.exit(1);
}
if (url.protocol !== 'https:') {
  console.error('Deploy bloqueado: VITE_SUPABASE_URL deve usar HTTPS.');
  process.exit(1);
}
if (/service[_-]?role/i.test(publishableKey)) {
  console.error('Deploy bloqueado: Service Role nunca pode entrar no frontend.');
  process.exit(1);
}

console.log('Variáveis públicas de deploy validadas.');
