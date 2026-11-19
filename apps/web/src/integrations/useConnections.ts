import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConnectionsData, ConnectionsRepository } from './contracts';
import { connectionsDue } from '../lib/auto-sync.ts';

export type ConnectionsState = {
  data: ConnectionsData | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string;
  reload: () => Promise<void>;
  connect: () => Promise<void>;
  sync: (connectionId: string) => Promise<void>;
  /** D-061: sincroniza em segundo plano as conexões vencidas; diz se algo rodou e se alguma falhou. */
  syncStale: () => Promise<'none' | 'synced' | 'failed'>;
  autoSyncing: boolean;
};

type PluggySuccess = { item?: { id?: string }; itemId?: string; id?: string };
type PluggyConnectInstance = { init(): void };
type PluggyConnectConstructor = new (options: {
  connectToken: string;
  onSuccess(payload: PluggySuccess): void;
  onError(error: unknown): void;
  onClose(): void;
}) => PluggyConnectInstance;

declare global { interface Window { PluggyConnect?: PluggyConnectConstructor } }

const sdkUrl = 'https://cdn.pluggy.ai/pluggy-connect/v2.8.0/pluggy-connect.js';

export function extractPluggyItemId(payload: PluggySuccess): string | null {
  return payload.item?.id ?? payload.itemId ?? payload.id ?? null;
}

async function loadSdk(): Promise<PluggyConnectConstructor> {
  if (window.PluggyConnect) return window.PluggyConnect;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-pluggy-connect]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('pluggy sdk unavailable')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = sdkUrl;
    script.async = true;
    script.dataset.pluggyConnect = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('pluggy sdk unavailable'));
    document.head.append(script);
  });
  if (!window.PluggyConnect) throw new Error('pluggy sdk invalid');
  return window.PluggyConnect;
}

export function useConnections(repository?: ConnectionsRepository): ConnectionsState {
  const [data, setData] = useState<ConnectionsData | null>(null);
  const [status, setStatus] = useState<ConnectionsState['status']>(repository ? 'loading' : 'idle');
  const [error, setError] = useState('');
  const [autoSyncing, setAutoSyncing] = useState(false);
  // Ref: quem chama syncStale num evento (voltar à aba) precisa ver os dados mais recentes, não os da montagem.
  const dataRef = useRef(data);
  dataRef.current = data;
  const autoSyncRunning = useRef(false);

  const reload = useCallback(async () => {
    if (!repository) return;
    setStatus('loading');
    setError('');
    try { setData(await repository.load()); setStatus('success'); }
    catch { setError('Não foi possível carregar as conexões bancárias.'); setStatus('error'); }
  }, [repository]);

  useEffect(() => { void reload(); }, [reload]);

  async function connect(): Promise<void> {
    if (!repository) throw new Error('connections repository missing');
    setError('');
    const [connectToken, PluggyConnect] = await Promise.all([repository.createConnectToken(), loadSdk()]);
    await new Promise<void>((resolve, reject) => {
      let connected = false;
      new PluggyConnect({
        connectToken,
        onSuccess: payload => {
          connected = true;
          const itemId = extractPluggyItemId(payload);
          if (!itemId) { reject(new Error('item missing')); return; }
          void repository.syncItem(itemId).then(reload).then(resolve, reject);
        },
        onError: reject,
        onClose: () => { if (!connected) resolve(); }
      }).init();
    });
  }

  async function sync(connectionId: string): Promise<void> {
    if (!repository) throw new Error('connections repository missing');
    setError('');
    try { await repository.syncConnection(connectionId); await reload(); }
    catch { setError('A sincronização falhou. A próxima tentativa retomará os dados sem duplicar lançamentos.'); throw new Error('sync failed'); }
  }

  async function syncStale(): Promise<'none' | 'synced' | 'failed'> {
    const due = repository && dataRef.current ? connectionsDue(dataRef.current.connections, Date.now()) : [];
    if (!repository || !due.length || autoSyncRunning.current) return 'none';
    autoSyncRunning.current = true;
    setAutoSyncing(true);
    let failed = false;
    // Uma conexão por vez; o servidor também recusa uma segunda sincronização ativa.
    for (const connection of due) {
      try { await repository.syncConnection(connection.id); } catch { failed = true; }
    }
    try { setData(await repository.load()); } catch { /* a lista anterior continua na tela */ }
    autoSyncRunning.current = false;
    setAutoSyncing(false);
    return failed ? 'failed' : 'synced';
  }

  return { data, status, error, reload, connect, sync, syncStale, autoSyncing };
}
