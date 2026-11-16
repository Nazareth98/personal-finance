import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.119.0';

function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}

export function serviceClient(): SupabaseClient {
  return createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export async function requireOwner(request: Request): Promise<{ ownerId: string; client: SupabaseClient }> {
  const authorization = request.headers.get('authorization');
  if (!authorization) throw new Error('authentication_required');
  const client = createClient(required('SUPABASE_URL'), required('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) throw new Error('authentication_required');
  const { data: profile, error: profileError } = await client.from('profiles').select('id').eq('id', userData.user.id).eq('is_owner', true).maybeSingle();
  if (profileError || !profile) throw new Error('owner_required');
  return { ownerId: userData.user.id, client };
}
