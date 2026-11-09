import { rpc } from "../lib/api";
export interface ConnectionIntent {
  connection_id: string;
  state: string;
  provider: "mock";
}
export interface SyncResult {
  status: "success" | "error";
  rows?: number;
  has_more?: boolean;
  retryable?: boolean;
  batch_id?: string;
}
export type Scope = "accounts" | "transactions" | "credit_cards";
export interface OpenFinanceProvider {
  readonly code: string;
  createConnectionIntent(input: {
    account: string;
    institution: string;
    scopes: Scope[];
  }): Promise<ConnectionIntent>;
  completeAuthorization(intent: ConnectionIntent): Promise<void>;
  synchronize(
    connection: string,
    simulateFailure?: boolean,
  ): Promise<SyncResult>;
  renewConsent(connection: string): Promise<void>;
  revokeConnection(connection: string): Promise<void>;
  capability(
    product: "accounts" | "transactions" | "statements",
    institution: string,
  ): "available" | "unavailable";
}
export class MockOpenFinanceProvider implements OpenFinanceProvider {
  readonly code = "mock";
  constructor(private readonly call: typeof rpc = rpc) {}
  createConnectionIntent(input: {
    account: string;
    institution: string;
    scopes: Scope[];
  }) {
    return this.call<ConnectionIntent>("mock_connection_intent", input);
  }
  completeAuthorization(intent: ConnectionIntent) {
    return this.call<void>("mock_authorize", {
      connection: intent.connection_id,
      state: intent.state,
    });
  }
  synchronize(connection: string, simulateFailure = false) {
    return this.call<SyncResult>("mock_sync", {
      connection,
      simulate_failure: simulateFailure,
    });
  }
  renewConsent(connection: string) {
    return this.call<void>("mock_consent_action", {
      connection,
      action: "renew",
    });
  }
  revokeConnection(connection: string) {
    return this.call<void>("mock_consent_action", {
      connection,
      action: "revoke",
    });
  }
  capability(
    product: "accounts" | "transactions" | "statements",
    institution: string,
  ) {
    return product === "statements" ||
      (institution === "Caixa" &&
        product !== "accounts" &&
        product !== "transactions")
      ? ("unavailable" as const)
      : ("available" as const);
  }
}
export function provider(code: string): OpenFinanceProvider {
  if (code !== "mock")
    throw new Error(
      "Integração real indisponível: depende de contrato, autorização e adaptador seguro no backend.",
    );
  return new MockOpenFinanceProvider();
}
