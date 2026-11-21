import { corsHeaders, json, safeError } from '../_shared/http.ts';
import { requireOwner, serviceClient } from '../_shared/supabase.ts';

type Body = { clientId?: unknown; clientSecret?: unknown };
/** Mesmo teste que o cliente do Pluggy faz ao autenticar: POST /auth precisa devolver uma apiKey. */
async function verifyPluggy(clientId: string, clientSecret: string): Promise<boolean> {
  const response = await fetch('https://api.pluggy.ai/auth', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ clientId, clientSecret })
  });
  // 4xx = chaves recusadas; demais falhas = Pluggy indisponível (vira 502, não “chaves erradas”).
  if (response.status >= 400 && response.status < 500) return false;
  if (!response.ok) throw new Error('pluggy_unavailable');
  const body = await response.json().catch(() => null) as { apiKey?: string } | null;
  return Boolean(body?.apiKey);
}

const valid = (value: unknown, max: number): value is string => typeof value === 'string' && value.length >= 8 && value.length <= max && !/\s/.test(value);

/** D-064: testa as chaves no Pluggy e só então guarda (Client Secret no Vault). Nunca devolve o segredo. */
Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  try {
    const { ownerId } = await requireOwner(request);
    const body = await request.json().catch(() => ({})) as Body;
    const clientId = typeof body.clientId === 'string' ? body.clientId.trim() : body.clientId;
    const clientSecret = typeof body.clientSecret === 'string' ? body.clientSecret.trim() : body.clientSecret;
    if (!valid(clientId, 200) || !valid(clientSecret, 400)) return json({ error: 'pluggy_credentials_format' }, 400);
    if (!await verifyPluggy(clientId, clientSecret)) return json({ error: 'pluggy_credentials_rejected' }, 422);
    const saved = await serviceClient().rpc('internal_set_pluggy_credentials', { p_owner_id: ownerId, p_client_id: clientId, p_client_secret: clientSecret });
    if (saved.error) throw saved.error;
    return json({ configured: true, clientIdSuffix: clientId.slice(-4), testedAt: saved.data });
  } catch (error) {
    const message = safeError(error);
    return json({ error: message }, message.includes('required') ? 401 : 502);
  }
});
