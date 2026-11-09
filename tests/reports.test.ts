import { expect, test } from "vitest";
import Papa from "papaparse";
import { ledgerCsv } from "../src/domain/reports";
import type { Transaction } from "../src/domain/finance";
test("CSV mantém centavos exatos, datas distintas e neutraliza fórmulas na descrição", () => {
  const tx = {
    id: "synthetic",
    description: '=HYPERLINK("https://example.test")',
    amount_cents: "-9000000000000",
    event_date: "2026-01-30",
    bank_date: "2026-02-02",
    competence: "2026-03-01",
    nature: "expense",
    status: "approved",
    source: "manual",
  } as Transaction;
  const csv = ledgerCsv([tx]);
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    delimiter: ";",
  }).data[0];
  expect(parsed.valor).toBe("-90000000000,00");
  expect(parsed.descricao).toBe(`'${tx.description}`);
  expect(parsed.data_bancaria).toBe("2026-02-02");
  expect(parsed.competencia).toBe("2026-03-01");
});
