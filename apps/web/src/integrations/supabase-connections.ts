import type { SupabaseClient } from '@supabase/supabase-js';
import type { ConnectionsData, ConnectionsRepository, PluggyConnection, PluggyCredentialsError, PluggyCredentialsStatus, SyncRun } from './contracts';

type ConnectionRow = {
  id: string; institution_name: string; status: PluggyConnection['status']; last_source_updated_at: string | null; last_attempt_at: string | null;
  last_success_at: string | null; last_error: string | null;
};
type CredentialsRow = { configured: boolean; client_id_suffix: string | null; tested_at: string | null };
type RunRow = {
  id: string; connection_id: string; status: SyncRun['status']; trigger_type: SyncRun['trigger'];
  imported_accounts: number; imported_transactions: number; skipped_transactions: number; created_at: string;
};

export class SupabaseConnectionsRepository implements ConnectionsRepository {
  constructor(private readonly client: SupabaseClient) {}

  async load(): Promise<ConnectionsData> {
    const [connectionsResult, runsResult, credentialsResult] = await Promise.all([
      this.client.from('pluggy_connections').select('id,institution_name,status,last_source_updated_at,last_attempt_at,last_success_at,last_error').order('updated_at', { ascending: false }),
      this.client.from('sync_runs').select('id,connection_id,status,trigger_type,imported_accounts,imported_transactions,skipped_transactions,created_at').order('created_at', { ascending: false }).limit(30),
      // Status das chaves é auxiliar: se falhar (instância sem a migração), a tela segue como antes.
      this.client.rpc('get_pluggy_credentials_status').then(result => result, () => ({ data: null, error: null }))
    ]);
    const error = connectionsResult.error ?? runsResult.error;
    if (error) throw error;
    const credentialsRow = (Array.isArray(credentialsResult.data) ? credentialsResult.data[0] : null) as CredentialsRow | null;
    const credentials: PluggyCredentialsStatus = credentialsRow?.configured
      ? { configured: true, ...(credentialsRow.client_id_suffix ? { clientIdSuffix: credentialsRow.client_id_suffix } : {}), ...(credentialsRow.tested_at ? { testedAt: credentialsRow.tested_at } : {}) }
      : { configured: false };
    return {
      credentials,
      connections: ((connectionsResult.data ?? []) as ConnectionRow[]).map(row => ({
        id: row.id,
        institutionName: row.institution_name,
        status: row.status,
        ...(row.last_source_updated_at ? { lastSourceUpdatedAt: row.last_source_updated_at } : {}),
        ...(row.last_attempt_at ? { lastAttemptAt: row.last_attempt_at } : {}),
        ...(row.last_success_at ? { lastSuccessAt: row.last_success_at } : {}),
        ...(row.last_error ? { lastError: row.last_error } : {})
      })),
      runs: ((runsResult.data ?? []) as RunRow[]).map(row => ({
        id: row.id,
        connectionId: row.connection_id,
        status: row.status,
        trigger: row.trigger_type,
        importedAccounts: row.imported_accounts,
        importedTransactions: row.imported_transactions,
        skippedTransactions: row.skipped_transactions,
        createdAt: row.created_at
      }))
    };
  }

  async createConnectToken(): Promise<string> {
    const { data, error } = await this.client.functions.invoke('pluggy-connect-token', { body: {} });
    if (error) throw error;
    const token = (data as { connectToken?: unknown } | null)?.connectToken;
    if (typeof token !== 'string' || !token) throw new Error('connect token missing');
    return token;
  }

  async syncConnection(connectionId: string): Promise<void> {
    const { error } = await this.client.functions.invoke('pluggy-sync', { body: { connectionId } });
    if (error) throw error;
  }

  async saveCredentials(clientId: string, clientSecret: string): Promise<PluggyCredentialsStatus> {
    const { data, error } = await this.client.functions.invoke('pluggy-credentials', { body: { clientId, clientSecret } });
    if (error) {
      const context = (error as { context?: unknown }).context;
      const body = context instanceof Response ? await context.clone().json().catch(() => null) as { error?: string } | null : null;
      const reason: PluggyCredentialsError = body?.error === 'pluggy_credentials_rejected' ? 'rejected'
        : body?.error === 'pluggy_credentials_format' ? 'format' : 'unavailable';
      throw new Error(reason);
    }
    const saved = data as { clientIdSuffix?: string; testedAt?: string } | null;
    return { configured: true, ...(saved?.clientIdSuffix ? { clientIdSuffix: saved.clientIdSuffix } : {}), ...(saved?.testedAt ? { testedAt: saved.testedAt } : {}) };
  }

  async syncItem(itemId: string): Promise<void> {
    const { error } = await this.client.functions.invoke('pluggy-sync', { body: { itemId } });
    if (error) throw error;
  }
}
