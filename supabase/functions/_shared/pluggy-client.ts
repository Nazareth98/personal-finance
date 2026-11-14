import type { PluggyAccount, PluggyTransaction } from './pluggy-domain.ts';

type Page<T> = { results: T[]; total?: number; totalPages?: number; page?: number };
type PluggyItem = { id: string; status?: string; connector?: { id?: number; name?: string } };

export class PluggyClient {
  private apiKey: string | null = null;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly baseUrl = 'https://api.pluggy.ai'
  ) {}

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
    return this.request('/connect_token', { method: 'POST', body: JSON.stringify({ clientUserId }) });
  }

  getItem(itemId: string): Promise<PluggyItem> {
    return this.request(`/items/${encodeURIComponent(itemId)}`);
  }

  getAccounts(itemId: string, page: number, pageSize = 100): Promise<Page<PluggyAccount>> {
    const query = new URLSearchParams({ itemId, page: String(page), pageSize: String(pageSize) });
    return this.request(`/accounts?${query}`);
  }

  getTransactions(accountId: string, page: number, pageSize = 500, from?: string): Promise<Page<PluggyTransaction>> {
    const query = new URLSearchParams({ accountId, page: String(page), pageSize: String(pageSize) });
    if (from) query.set('from', from);
    return this.request(`/transactions?${query}`);
  }
}
