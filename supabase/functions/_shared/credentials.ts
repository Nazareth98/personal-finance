import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.119.0';

/**
 * Chaves do Pluggy do dono (D-064): primeiro as informadas no app (Vault), depois as variáveis de
 * ambiente da função — que seguem valendo para instâncias configuradas antes desta mudança.
 */
export async function pluggyCredentials(database: SupabaseClient, ownerId: string): Promise<{ clientId: string; clientSecret: string }> {
  const stored = await database.rpc('internal_get_pluggy_credentials', { p_owner_id: ownerId });
  if (stored.error) throw stored.error;
  const row = (stored.data as { client_id: string; client_secret: string }[] | null)?.[0];
  if (row?.client_id && row.client_secret) return { clientId: row.client_id, clientSecret: row.client_secret };
  const clientId = Deno.env.get('PLUGGY_CLIENT_ID');
  const clientSecret = Deno.env.get('PLUGGY_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('pluggy_not_configured');
  return { clientId, clientSecret };
}
