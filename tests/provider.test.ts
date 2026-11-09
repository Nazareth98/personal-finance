import { expect, test, vi } from "vitest";
import {
  MockOpenFinanceProvider,
  provider,
} from "../src/open-finance/provider";
test("produção falha fechada sem adaptador autorizado", () => {
  expect(() => provider("pluggy")).toThrow(/contrato/);
  expect(() => provider("belvo")).toThrow();
});
test("mock delega autorização e sincronização ao backend, sem workspace do navegador", async () => {
  const call = vi.fn().mockResolvedValue({ status: "success", rows: 1 });
  const mock = new MockOpenFinanceProvider(call);
  await mock.synchronize("connection");
  expect(call).toHaveBeenCalledWith("mock_sync", {
    connection: "connection",
    simulate_failure: false,
  });
  await mock.revokeConnection("connection");
  expect(call).toHaveBeenLastCalledWith("mock_consent_action", {
    connection: "connection",
    action: "revoke",
  });
  expect(mock.capability("statements", "Caixa")).toBe("unavailable");
});
