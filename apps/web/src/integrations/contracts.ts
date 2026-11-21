export type PluggyConnectionStatus = 'pending' | 'updating' | 'ready' | 'error' | 'login_required';
export type PluggyConnection = {
  id: string;
  institutionName: string;
  status: PluggyConnectionStatus;
  lastSourceUpdatedAt?: string;
  lastAttemptAt?: string;
  lastSuccessAt?: string;
  lastError?: string;
};
export type SyncRun = {
  id: string;
  connectionId: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed';
  trigger: 'initial' | 'manual' | 'webhook' | 'resume';
  importedAccounts: number;
  importedTransactions: number;
  skippedTransactions: number;
  createdAt: string;
};
/** D-064: o app só sabe se há chaves guardadas, o final do Client ID e quando foram testadas. O segredo nunca chega aqui. */
export type PluggyCredentialsStatus = { configured: boolean; clientIdSuffix?: string; testedAt?: string };
export type ConnectionsData = { connections: PluggyConnection[]; runs: SyncRun[]; credentials?: PluggyCredentialsStatus };
/** Motivo legível de uma falha ao salvar as chaves (D-064). */
export type PluggyCredentialsError = 'format' | 'rejected' | 'unavailable';

export interface ConnectionsRepository {
  load(): Promise<ConnectionsData>;
  createConnectToken(): Promise<string>;
  syncConnection(connectionId: string): Promise<void>;
  syncItem(itemId: string): Promise<void>;
  /** Testa no Pluggy e guarda no cofre do backend. Lança `Error(PluggyCredentialsError)`. */
  saveCredentials(clientId: string, clientSecret: string): Promise<PluggyCredentialsStatus>;
}
