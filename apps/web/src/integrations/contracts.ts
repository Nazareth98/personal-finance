export type PluggyConnectionStatus = 'pending' | 'updating' | 'ready' | 'error' | 'login_required';
export type PluggyConnection = {
  id: string;
  institutionName: string;
  status: PluggyConnectionStatus;
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
export type ConnectionsData = { connections: PluggyConnection[]; runs: SyncRun[] };

export interface ConnectionsRepository {
  load(): Promise<ConnectionsData>;
  createConnectToken(): Promise<string>;
  syncConnection(connectionId: string): Promise<void>;
  syncItem(itemId: string): Promise<void>;
}
