import { PluggyClient } from '../_shared/pluggy-client.ts';
import { json, safeError } from '../_shared/http.ts';
import { serviceClient } from '../_shared/supabase.ts';
import { synchronizeConnection } from '../_shared/sync.ts';

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}

async function authorized(request: Request, body: string, secret: string): Promise<boolean> {
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const direct = request.headers.get('x-pluggy-webhook-secret') ?? bearer;
  if (direct && constantTimeEqual(direct, secret)) return true;
  const signature = request.headers.get('x-pluggy-signature')?.replace(/^sha256=/i, '') ?? '';
  if (!signature) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)));
  return constantTimeEqual(signature, bytesToHex(digest)) || constantTimeEqual(signature, bytesToBase64(digest));
}

async function stableEventId(payload: Record<string, unknown>, rawBody: string): Promise<string> {
  const direct = payload.eventId ?? payload.id;
  if (typeof direct === 'string' && direct.length > 0) return direct.slice(0, 200);
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawBody)));
  return `sha256:${bytesToHex(hash)}`;
}

function eventItemId(payload: Record<string, unknown>): string | null {
  const data = payload.data && typeof payload.data === 'object' ? payload.data as Record<string, unknown> : {};
  const item = data.item && typeof data.item === 'object' ? data.item as Record<string, unknown> : {};
  const value = payload.itemId ?? data.itemId ?? item.id;
  return typeof value === 'string' ? value : null;
}

async function processEvent(eventId: string, itemId: string | null): Promise<void> {
  const database = serviceClient();
  try {
    if (!itemId) {
      await database.rpc('internal_update_webhook_event', { p_provider_event_id: eventId, p_status: 'ignored', p_last_error: null });
      return;
    }
    const connection = await database.from('pluggy_connections').select('id,owner_id').eq('item_id', itemId).maybeSingle();
    if (connection.error) throw connection.error;
    if (!connection.data) {
      await database.rpc('internal_update_webhook_event', { p_provider_event_id: eventId, p_status: 'ignored', p_last_error: null });
      return;
    }
    await database.rpc('internal_update_webhook_event', { p_provider_event_id: eventId, p_status: 'processing', p_last_error: null });
    const clientId = Deno.env.get('PLUGGY_CLIENT_ID');
    const clientSecret = Deno.env.get('PLUGGY_CLIENT_SECRET');
    if (!clientId || !clientSecret) throw new Error('pluggy_not_configured');
    await synchronizeConnection(database, new PluggyClient(clientId, clientSecret), connection.data.id, connection.data.owner_id, 'webhook');
    await database.rpc('internal_update_webhook_event', { p_provider_event_id: eventId, p_status: 'processed', p_last_error: null });
  } catch (error) {
    await database.rpc('internal_update_webhook_event', {
      p_provider_event_id: eventId, p_status: 'failed', p_last_error: safeError(error)
    });
  }
}

Deno.serve(async request => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const secret = Deno.env.get('PLUGGY_WEBHOOK_SECRET');
  if (!secret) return json({ error: 'webhook_not_configured' }, 503);
  const rawBody = await request.text();
  if (!await authorized(request, rawBody, secret)) return json({ error: 'invalid_webhook_signature' }, 401);
  let payload: Record<string, unknown>;
  try { payload = JSON.parse(rawBody) as Record<string, unknown>; }
  catch { return json({ error: 'invalid_json' }, 400); }

  const eventId = await stableEventId(payload, rawBody);
  const eventType = String(payload.event ?? payload.type ?? 'unknown').slice(0, 120);
  const itemId = eventItemId(payload);
  const database = serviceClient();
  const stored = await database.rpc('internal_register_webhook_event', {
    p_provider_event_id: eventId, p_event_type: eventType, p_item_id: itemId, p_payload: payload
  });
  if (stored.error) return json({ error: 'webhook_persistence_failed' }, 503);
  if (stored.data !== 'new' && stored.data !== 'failed') return json({ accepted: true, duplicate: true }, 202);

  EdgeRuntime.waitUntil(processEvent(eventId, itemId));
  return json({ accepted: true }, 202);
});
