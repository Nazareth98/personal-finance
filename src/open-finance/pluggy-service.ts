/**
 * Serviço de comunicação direta com a API REST da Pluggy.
 * Executa em ambiente de servidor (Vite dev server / Edge Functions / scripts).
 * NUNCA deve ser importado em componentes puramente de cliente com credenciais embutidas.
 */

export interface PluggyAuthResponse {
  apiKey: string;
}

export interface PluggyConnectTokenResponse {
  accessToken: string;
}

export interface PluggyAccountItem {
  id: string;
  type: "BANK" | "CREDIT";
  subtype?: string;
  name: string;
  balance?: number;
  currencyCode?: string;
  itemId: string;
  number?: string;
}

export interface PluggyTransactionItem {
  id: string;
  description: string;
  descriptionRaw?: string;
  amount: number;
  date: string;
  status: "POSTED" | "PENDING";
  category?: string;
  categoryId?: string;
  accountId: string;
}

export class PluggyService {
  private cachedApiKey: string | null = null;
  private apiKeyExpiresAt = 0;
  private readonly baseUrl = "https://api.pluggy.ai";

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {}

  /**
   * Obtém a apiKey autenticada (JWT) com cache em memória (válida por 2 horas).
   */
  async getApiKey(): Promise<string> {
    const now = Date.now();
    if (this.cachedApiKey && this.apiKeyExpiresAt > now + 60_000) {
      return this.cachedApiKey;
    }

    const res = await fetch(`${this.baseUrl}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: this.clientId,
        clientSecret: this.clientSecret,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Falha na autenticação Pluggy (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as PluggyAuthResponse;
    this.cachedApiKey = data.apiKey;
    // O token expira em 2 horas (7200s); renovamos 5 minutos antes
    this.apiKeyExpiresAt = now + 7100 * 1000;
    return this.cachedApiKey;
  }

  /**
   * Gera um Connect Token efêmero (~30 minutos) para o widget react-pluggy-connect no frontend.
   */
  async createConnectToken(clientUserId?: string): Promise<string> {
    const apiKey = await this.getApiKey();
    const res = await fetch(`${this.baseUrl}/connect_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify(clientUserId ? { clientUserId } : {}),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Falha ao gerar Connect Token Pluggy (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as PluggyConnectTokenResponse;
    return data.accessToken;
  }

  /**
   * Busca as contas associadas a um Item conectado.
   */
  async fetchAccounts(itemId: string): Promise<PluggyAccountItem[]> {
    const apiKey = await this.getApiKey();
    const url = new URL(`${this.baseUrl}/accounts`);
    url.searchParams.set("itemId", itemId);

    const res = await fetch(url.toString(), {
      headers: { "X-API-KEY": apiKey },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Falha ao listar contas Pluggy (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return (data.results || data) as PluggyAccountItem[];
  }

  /**
   * Busca as transações de uma conta específica em um intervalo de datas.
   */
  async fetchTransactions(
    accountId: string,
    options: { from?: string; to?: string; pageSize?: number } = {},
  ): Promise<PluggyTransactionItem[]> {
    const apiKey = await this.getApiKey();
    const url = new URL(`${this.baseUrl}/transactions`);
    url.searchParams.set("accountId", accountId);

    if (options.from) url.searchParams.set("from", options.from);
    if (options.to) url.searchParams.set("to", options.to);
    if (options.pageSize) url.searchParams.set("pageSize", options.pageSize.toString());

    const res = await fetch(url.toString(), {
      headers: { "X-API-KEY": apiKey },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Falha ao buscar transações Pluggy (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return (data.results || data) as PluggyTransactionItem[];
  }

  /**
   * Revoga / exclui um Item na Pluggy.
   */
  async deleteItem(itemId: string): Promise<void> {
    const apiKey = await this.getApiKey();
    const res = await fetch(`${this.baseUrl}/items/${itemId}`, {
      method: "DELETE",
      headers: { "X-API-KEY": apiKey },
    });

    if (!res.ok && res.status !== 404) {
      const errText = await res.text();
      throw new Error(`Falha ao excluir item Pluggy (${res.status}): ${errText}`);
    }
  }
}

