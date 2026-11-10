import { rpc } from "../lib/api";
import { pluggyClient } from "./pluggy-client";
import { mapPluggyTransactions } from "./pluggy-mapper";
import type {
  ConnectionIntent,
  OpenFinanceProvider,
  Scope,
  SyncResult,
} from "./provider";

export interface PluggyConnectionIntent extends ConnectionIntent {
  provider: "pluggy";
  connect_token: string;
  account: string;
  institution: string;
  scopes: Scope[];
}

export class PluggyOpenFinanceProvider implements OpenFinanceProvider {
  readonly code = "pluggy";

  constructor(
    private readonly call: typeof rpc = rpc,
    private readonly client = pluggyClient,
  ) {}

  /**
   * Prepara o intent de conexão gerando o connectToken seguro da Pluggy.
   */
  async createConnectionIntent(_input: {
    account: string;
    institution: string;
    scopes: Scope[];
  }): Promise<ConnectionIntent> {
    const connectToken = await this.client.getConnectToken();
    return {
      connection_id: "",
      state: connectToken,
      provider: "pluggy",
    };
  }

  /**
   * Finaliza a autorização registrando a conexão no banco via RPC segura.
   */
  async completeAuthorization(
    intent: ConnectionIntent & {
      itemId?: string;
      account?: string;
      institution?: string;
      scopes?: Scope[];
      pluggyAccount?: string;
    },
  ): Promise<void> {
    if (!intent.itemId || !intent.account) {
      throw new Error("Item da Pluggy ou conta local não identificada");
    }

    await this.call<string>("pluggy_register_connection", {
      account: intent.account,
      institution: intent.institution || "Pluggy Connect",
      scopes: intent.scopes || ["accounts", "transactions"],
      item_id: intent.itemId,
      pluggy_account: intent.pluggyAccount || null,
    });
  }

  /**
   * Sincroniza dados da Pluggy: busca transações, mapeia para Proposal e envia ao stage_import.
   */
  async synchronize(
    connectionId: string,
    _simulateFailure = false,
  ): Promise<SyncResult> {
    // Busca informações da conexão para obter o item_id e pluggy_account_id
    // Como a RPC pluggy_stage_transactions valida no backend, podemos buscar as transações
    // a partir do pluggyClient e submeter via RPC
    const snapshot = await this.call<any>("workspace_snapshot", {});
    const connection = (snapshot.open_finance_connections || []).find(
      (c: any) => c.id === connectionId,
    );

    if (!connection) {
      throw new Error("Conexão não encontrada");
    }

    const itemId = connection.pluggy_item_id;
    if (!itemId) {
      throw new Error("Conexão não possui ID do Item Pluggy vinculado");
    }

    // Busca as contas da Pluggy vinculadas ao item
    const accounts = await this.client.getAccounts(itemId);
    if (!accounts.length) {
      return { status: "success", rows: 0 };
    }

    // Identifica o tipo da conta local (checking vs credit)
    const localAccount = (snapshot.financial_accounts || []).find(
      (a: any) => a.id === connection.account_id,
    );
    const accountKind = localAccount?.kind || "checking";

    let totalImported = 0;
    let lastBatchId: string | undefined;

    // Para cada conta da Pluggy do item (ou a conta específica mapeada)
    for (const acc of accounts) {
      if (connection.pluggy_account_id && acc.id !== connection.pluggy_account_id) {
        continue;
      }

      // Busca transações dos últimos 90 dias
      const from = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
      const to = new Date().toISOString().slice(0, 10);

      const rawTransactions = await this.client.getTransactions(acc.id, { from, to });
      const { rows } = mapPluggyTransactions(rawTransactions, {
        accountKind: acc.type === "CREDIT" ? "credit" : accountKind,
      });

      if (rows.length > 0) {
        const hash = `pluggy:${connection.id}:${acc.id}:${Date.now()}`;
        const result = await this.call<SyncResult>("pluggy_stage_transactions", {
          connection: connection.id,
          hash,
          rows,
        });

        totalImported += result.rows || 0;
        if (result.batch_id) {
          lastBatchId = result.batch_id;
        }
      }
    }

    return {
      status: "success",
      rows: totalImported,
      batch_id: lastBatchId,
      has_more: false,
    };
  }

  /**
   * Renova o consentimento da conexão.
   */
  async renewConsent(connectionId: string): Promise<void> {
    await this.call<void>("mock_consent_action", {
      connection: connectionId,
      action: "renew",
    });
  }

  /**
   * Revoga a conexão na Pluggy e no banco local.
   */
  async revokeConnection(connectionId: string): Promise<void> {
    const snapshot = await this.call<any>("workspace_snapshot", {});
    const connection = (snapshot.open_finance_connections || []).find(
      (c: any) => c.id === connectionId,
    );

    if (connection?.pluggy_item_id) {
      try {
        await this.client.deleteItem(connection.pluggy_item_id);
      } catch (err) {
        console.warn("Falha ao excluir item na Pluggy:", err);
      }
    }

    await this.call<void>("mock_consent_action", {
      connection: connectionId,
      action: "revoke",
    });
  }

  capability(
    product: "accounts" | "transactions" | "statements",
    _institution: string,
  ): "available" | "unavailable" {
    return product === "statements" ? "unavailable" : "available";
  }
}
