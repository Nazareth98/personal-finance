import { PluggyClient } from '../_shared/pluggy-client.ts';
import { corsHeaders, json, safeError } from '../_shared/http.ts';
import { requireOwner, serviceClient } from '../_shared/supabase.ts';
import { pluggyCredentials } from '../_shared/credentials.ts';

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  try {
    const { ownerId } = await requireOwner(request);
    const { clientId, clientSecret } = await pluggyCredentials(serviceClient(), ownerId);
    const token = await new PluggyClient(clientId, clientSecret).createConnectToken(ownerId);
    return json({ connectToken: token.accessToken });
  } catch (error) {
    const message = safeError(error);
    return json({ error: message }, message.includes('required') ? 401 : message === 'pluggy_not_configured' ? 409 : 502);
  }
});
