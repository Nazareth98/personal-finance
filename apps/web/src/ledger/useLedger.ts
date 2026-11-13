import { useCallback, useEffect, useState } from 'react';
import type { AccountDraft, LedgerData, LedgerRepository, ManualTransactionDraft } from './contracts';

export type LedgerState = {
  data: LedgerData | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string;
  reload: () => Promise<void>;
  createAccount: (draft: AccountDraft) => Promise<void>;
  createTransaction: (draft: ManualTransactionDraft) => Promise<void>;
};

export function useLedger(repository?: LedgerRepository): LedgerState {
  const [data, setData] = useState<LedgerData | null>(null);
  const [status, setStatus] = useState<LedgerState['status']>(repository ? 'loading' : 'idle');
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!repository) return;
    setStatus('loading');
    setError('');
    try {
      setData(await repository.load());
      setStatus('success');
    } catch {
      setError('Não foi possível carregar o livro financeiro.');
      setStatus('error');
    }
  }, [repository]);

  useEffect(() => { void reload(); }, [reload]);

  async function createAccount(draft: AccountDraft) {
    if (!repository) throw new Error('ledger repository missing');
    await repository.createAccount(draft);
    await reload();
  }

  async function createTransaction(draft: ManualTransactionDraft) {
    if (!repository) throw new Error('ledger repository missing');
    await repository.createManualTransaction(draft);
    await reload();
  }

  return { data, status, error, reload, createAccount, createTransaction };
}
