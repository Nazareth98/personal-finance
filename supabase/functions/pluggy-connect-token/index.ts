import { PluggyClient } from '../_shared/pluggy-client.ts';
import { corsHeaders, json, safeError } from '../_shared/http.ts';
import { requireOwner } from '../_shared/supabase.ts';

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  try {
    const { ownerId } = await requireOwner(request);
    const clientId = Deno.env.get('PLUGGY_CLIENT_ID');
    const clientSecret = Deno.env.get('PLUGGY_CLIENT_SECRET');
    if (!clientId || !clientSecret) throw new Error('pluggy_not_configured');
    const token = await new PluggyClient(clientId, clientSecret).createConnectToken(ownerId);
    return json({ connectToken: token.accessToken });
  } catch (error) {
    const message = safeError(error);
    return json({ error: message }, message.includes('required') ? 401 : 502);
  }
});
