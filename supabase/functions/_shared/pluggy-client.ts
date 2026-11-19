import type { PluggyAccount, PluggyTransaction } from './pluggy-domain.ts';

type Page<T> = { results: T[]; total?: number; totalPages?: number; page?: number };
type CursorPage<T> = { results: T[]; next: string | null };
type PluggyItem = { id: string; status?: string; lastUpdatedAt?: string | null; connector?: { id?: number; name?: string } };

export class PluggyClient {
  private apiKey: string | null = null;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;

  constructor(clientId: string, clientSecret: string, baseUrl = 'https://api.pluggy.ai') {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.baseUrl = baseUrl;
  }

  private async authenticate(): Promise<string> {
    if (this.apiKey) return this.apiKey;
    const response = await fetch(`${this.baseUrl}/auth`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ clientId: this.clientId, clientSecret: this.clientSecret })
    });
    if (!response.ok) throw new Error(`pluggy_auth_${response.status}`);
    const body = await response.json() as { apiKey?: string };
    if (!body.apiKey) throw new Error('pluggy_auth_invalid_response');
    this.apiKey = body.apiKey;
    return body.apiKey;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const apiKey = await this.authenticate();
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, ...init.headers }
    });
    if (!response.ok) throw new Error(`pluggy_request_${response.status}`);
    return await response.json() as T;
  }

  createConnectToken(clientUserId: string): Promise<{ accessToken: string }> {
    return this.request('/connect_token', { method: 'POST', body: JSON.stringify({ options: { clientUserId } }) });
  }

  getItem(itemId: string): Promise<PluggyItem> {
    return this.request(`/items/${encodeURIComponent(itemId)}`);
  }

  getAccounts(itemId: string, page: number, pageSize = 100): Promise<Page<PluggyAccount>> {
    const query = new URLSearchParams({ itemId, page: String(page), pageSize: String(pageSize) });
    return this.request(`/accounts?${query}`);
  }

  getTransactions(accountId: string, createdAtFrom?: string, next?: string | null): Promise<CursorPage<PluggyTransaction>> {
    if (next && !next.startsWith('?')) throw new Error('pluggy_transactions_invalid_cursor');
    const query = new URLSearchParams({ accountId });
    if (createdAtFrom) query.set('createdAtFrom', createdAtFrom);
    return this.request(next ? `/v2/transactions${next}` : `/v2/transactions?${query}`);
  }

  getTransactionsByIds(accountId: string, ids: string[], next?: string | null): Promise<CursorPage<PluggyTransaction>> {
    if (ids.length === 0 || ids.length > 500) throw new Error('pluggy_transactions_invalid_ids');
    if (next && !next.startsWith('?')) throw new Error('pluggy_transactions_invalid_cursor');
    const query = new URLSearchParams({ accountId, ids: ids.join(',') });
    return this.request(next ? `/v2/transactions${next}` : `/v2/transactions?${query}`);
  }
}
