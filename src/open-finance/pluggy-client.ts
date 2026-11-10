import { supabase } from "../lib/supabase";
import type {
  PluggyAccountItem,
  PluggyTransactionItem,
} from "./pluggy-service";

export class PluggyApiClient {
  /**
   * Obtém o connectToken para abrir o widget PluggyConnect.
   */
  async getConnectToken(clientUserId?: string): Promise<string> {
    if (import.meta.env.DEV) {
      const res = await fetch("/api/pluggy/connect-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientUserId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro ao gerar token" }));
        throw new Error(err.error || "Falha na comunicação com a API local Pluggy");
      }
      const data = await res.json();
      return data.accessToken;
    }

    // Produção: Supabase Edge Function
    if (!supabase) {
      throw new Error("Cliente Supabase não configurado");
    }
    const { data, error } = await supabase.functions.invoke("pluggy-api", {
      body: { clientUserId },
      headers: { "Content-Type": "application/json" },
    });

    if (error || !data?.accessToken) {
      throw new Error(error?.message || "Falha ao obter token da Pluggy via Edge Function");
    }

    return data.accessToken;
  }

  /**
   * Lista as contas Pluggy vinculadas a um item.
   */
  async getAccounts(itemId: string): Promise<PluggyAccountItem[]> {
    if (import.meta.env.DEV) {
      const res = await fetch(`/api/pluggy/accounts?itemId=${encodeURIComponent(itemId)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro ao listar contas" }));
        throw new Error(err.error || "Falha ao listar contas");
      }
      const data = await res.json();
      return data.accounts || [];
    }

    if (!supabase) {
      throw new Error("Cliente Supabase não configurado");
    }
    const { data, error } = await supabase.functions.invoke(
      `pluggy-api?action=accounts&itemId=${encodeURIComponent(itemId)}`,
    );

    if (error) {
      throw new Error(error.message || "Falha ao buscar contas via Edge Function");
    }

    return data?.accounts || [];
  }

  /**
   * Busca transações de uma conta específica na Pluggy.
   */
  async getTransactions(
    accountId: string,
    options: { from?: string; to?: string } = {},
  ): Promise<PluggyTransactionItem[]> {
    if (import.meta.env.DEV) {
      const url = new URL("/api/pluggy/transactions", window.location.origin);
      url.searchParams.set("accountId", accountId);
      if (options.from) url.searchParams.set("from", options.from);
      if (options.to) url.searchParams.set("to", options.to);

      const res = await fetch(url.toString());
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro ao buscar transações" }));
        throw new Error(err.error || "Falha ao buscar transações");
      }
      const data = await res.json();
      return data.transactions || [];
    }

    const query = new URLSearchParams({
      action: "transactions",
      accountId,
      ...(options.from ? { from: options.from } : {}),
      ...(options.to ? { to: options.to } : {}),
    });

    if (!supabase) {
      throw new Error("Cliente Supabase não configurado");
    }
    const { data, error } = await supabase.functions.invoke(`pluggy-api?${query.toString()}`);

    if (error) {
      throw new Error(error.message || "Falha ao buscar transações via Edge Function");
    }

    return data?.transactions || [];
  }

  /**
   * Exclui / revoga um item na Pluggy.
   */
  async deleteItem(itemId: string): Promise<void> {
    if (import.meta.env.DEV) {
      const res = await fetch(`/api/pluggy/items/${encodeURIComponent(itemId)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro ao excluir conexão" }));
        throw new Error(err.error || "Falha ao revogar conexão");
      }
      return;
    }

    if (!supabase) {
      throw new Error("Cliente Supabase não configurado");
    }
    const { error } = await supabase.functions.invoke(
      `pluggy-api?action=delete-item&itemId=${encodeURIComponent(itemId)}`,
      { method: "DELETE" },
    );

    if (error) {
      throw new Error(error.message || "Falha ao revogar item via Edge Function");
    }
  }
}

export const pluggyClient = new PluggyApiClient();
