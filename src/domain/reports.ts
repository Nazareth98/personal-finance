import Papa from "papaparse";
import type { Transaction } from "./finance";
function spreadsheetText(value: string) {
  return /^[=+\-@\t\r\n]/.test(value) ? `'${value}` : value;
}
export function ledgerCsv(transactions: Transaction[]): string {
  return (
    "\uFEFF" +
    Papa.unparse(
      transactions.map((t) => {
        const value = BigInt(t.amount_cents),
          absolute = value < 0n ? -value : value;
        return {
          id: t.id,
          data: t.event_date,
          data_bancaria: t.bank_date,
          competencia: t.competence,
          descricao: spreadsheetText(t.description),
          valor: `${value < 0n ? "-" : ""}${absolute / 100n},${String(absolute % 100n).padStart(2, "0")}`,
          natureza: t.nature,
          status: t.status,
          origem: t.source,
        };
      }),
      { delimiter: ";", newline: "\r\n" },
    )
  );
}
