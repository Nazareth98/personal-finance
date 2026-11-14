import { PluggyClient } from '../_shared/pluggy-client.ts';
import { corsHeaders, json, safeError } from '../_shared/http.ts';
import { requireOwner, serviceClient } from '../_shared/supabase.ts';
import { synchronizeConnection, type SyncTrigger } from '../_shared/sync.ts';

type RequestBody = { connectionId?: string; itemId?: string };

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  try {
    const { ownerId } = await requireOwner(request);
    const body = await request.json() as RequestBody;
    if (!body.connectionId && !body.itemId) return json({ error: 'connection_or_item_required' }, 400);
    const clientId = Deno.env.get('PLUGGY_CLIENT_ID');
    const clientSecret = Deno.env.get('PLUGGY_CLIENT_SECRET');
    if (!clientId || !clientSecret) throw new Error('pluggy_not_configured');
    const pluggy = new PluggyClient(clientId, clientSecret);
    const database = serviceClient();
    let connectionId = body.connectionId;
    let trigger: SyncTrigger = 'manual';

    if (body.itemId) {
      if (!/^[A-Za-z0-9_-]{6,160}$/.test(body.itemId)) return json({ error: 'invalid_item' }, 400);
      const item = await pluggy.getItem(body.itemId);
      const connection = await database.from('pluggy_connections').upsert({
        owner_id: ownerId,
        item_id: body.itemId,
        connector_id: item.connector?.id ?? null,
        institution_name: (item.connector?.name?.trim() || 'Instituição conectada').slice(0, 100),
        status: 'pending',
        updated_at: new Date().toISOString()
      }, { onConflict: 'owner_id,item_id' }).select('id,last_success_at').single();
      if (connection.error) throw connection.error;
      connectionId = connection.data.id;
      trigger = connection.data.last_success_at ? 'manual' : 'initial';
    }

    if (!connectionId || !/^[0-9a-f-]{36}$/i.test(connectionId)) return json({ error: 'invalid_connection' }, 400);
    const result = await synchronizeConnection(database, pluggy, connectionId, ownerId, trigger);
    return json(result);
  } catch (error) {
    const message = safeError(error);
    const status = message === 'sync_already_running' ? 409 : message.includes('required') ? 401 : 502;
    return json({ error: message }, status);
  }
});
