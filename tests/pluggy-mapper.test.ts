import { describe, expect, it } from "vitest";
import {
  mapPluggyTransaction,
  mapPluggyTransactions,
  type PluggyTransaction,
} from "../src/open-finance/pluggy-mapper";

describe("mapPluggyTransaction", () => {
  it("mapeia débito em conta bancária como despesa com centavos exatos", () => {
    const tx: PluggyTransaction = {
      id: "tx_123",
      description: "Supermercado Extra",
      descriptionRaw: "SUPERMERCADO EXTRA SP",
      amount: -152.45,
      date: "2026-05-15T14:30:00.000Z",
      status: "POSTED",
    };

    const res = mapPluggyTransaction(tx, { accountKind: "checking" });
    expect(res).not.toBeNull();
    expect(res?.description).toBe("SUPERMERCADO EXTRA SP");
    expect(res?.amount_cents).toBe("-15245");
    expect(res?.nature).toBe("expense");
    expect(res?.event_date).toBe("2026-05-15");
    expect(res?.bank_date).toBe("2026-05-15");
    expect(res?.competence).toBe("2026-05-01");
    expect(res?.external_key).toBe("pluggy:tx_123");
    expect(res?.original_text).toContain("Supermercado Extra");
  });

  it("mapeia crédito em conta bancária como receita", () => {
    const tx: PluggyTransaction = {
      id: "tx_456",
      description: "PIX Recebido de João",
      amount: 1500.0,
      date: "2026-05-10T09:00:00.000Z",
      status: "POSTED",
    };

    const res = mapPluggyTransaction(tx, { accountKind: "checking" });
    expect(res).not.toBeNull();
    expect(res?.description).toBe("PIX Recebido de João");
    expect(res?.amount_cents).toBe("150000");
    expect(res?.nature).toBe("income");
    expect(res?.event_date).toBe("2026-05-10");
    expect(res?.competence).toBe("2026-05-01");
    expect(res?.external_key).toBe("pluggy:tx_456");
  });

  it("mapeia compra em cartão de crédito como despesa", () => {
    const tx: PluggyTransaction = {
      id: "tx_card_1",
      description: "Restaurante",
      amount: 89.9, // No cartão da Pluggy, compras vêm positivas
      date: "2026-06-02T20:00:00.000Z",
      status: "POSTED",
    };

    const res = mapPluggyTransaction(tx, { accountKind: "credit" });
    expect(res).not.toBeNull();
    expect(res?.amount_cents).toBe("-8990");
    expect(res?.nature).toBe("expense");
    expect(res?.event_date).toBe("2026-06-02");
    expect(res?.competence).toBe("2026-06-01");
  });

  it("mapeia estorno em cartão de crédito como refund", () => {
    const tx: PluggyTransaction = {
      id: "tx_card_refund",
      description: "Estorno Compra Cancelada",
      amount: -50.0, // No cartão da Pluggy, estorno/pagamento vem negativo
      date: "2026-06-05T10:00:00.000Z",
      status: "POSTED",
    };

    const res = mapPluggyTransaction(tx, { accountKind: "credit" });
    expect(res).not.toBeNull();
    expect(res?.amount_cents).toBe("5000");
    expect(res?.nature).toBe("refund");
  });

  it("ignora transações com status PENDING por padrão", () => {
    const tx: PluggyTransaction = {
      id: "tx_pending",
      description: "Uber Pendente",
      amount: -25.5,
      date: "2026-06-10T12:00:00.000Z",
      status: "PENDING",
    };

    expect(mapPluggyTransaction(tx)).toBeNull();
    expect(mapPluggyTransaction(tx, { includePending: true })).not.toBeNull();
  });

  it("ignora transações de valor 0", () => {
    const tx: PluggyTransaction = {
      id: "tx_zero",
      description: "Verificação de Conta",
      amount: 0,
      date: "2026-06-10T12:00:00.000Z",
      status: "POSTED",
    };

    expect(mapPluggyTransaction(tx)).toBeNull();
  });

  it("lida com lista de transações e filtra inválidas", () => {
    const txs: PluggyTransaction[] = [
      {
        id: "tx_1",
        description: "Almoço",
        amount: -35.0,
        date: "2026-07-01T12:00:00.000Z",
        status: "POSTED",
      },
      {
        id: "tx_2",
        description: "Pendente",
        amount: -50.0,
        date: "2026-07-02T12:00:00.000Z",
        status: "PENDING",
      },
      {
        id: "tx_3",
        description: "Salário",
        amount: 5000.0,
        date: "2026-07-05T12:00:00.000Z",
        status: "POSTED",
      },
    ];

    const result = mapPluggyTransactions(txs);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].external_key).toBe("pluggy:tx_1");
    expect(result.rows[1].external_key).toBe("pluggy:tx_3");
  });
});

