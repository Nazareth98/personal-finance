import { expect, test } from "vitest";
import { parseCsv, parseOfx, parsePdfLines } from "../src/importers";
test("preserva campos originais para conciliação privada", () => {
  const csv = parseCsv(
    "data;descrição;valor;observação\n09/01/2026;Loja fictícia;-10,50;campo original",
  );
  expect(csv.rows[0].original_row?.observacao).toBe("campo original");
  const pdf = parsePdfLines(["09/01/2026 Loja fictícia 10,50 D"]);
  expect(pdf.rows[0].original_text).toBe("09/01/2026 Loja fictícia 10,50 D");
});
test("CSV preserva duas compras iguais e centavos com delimitador brasileiro", () => {
  const p = parseCsv(
    "data;descrição;valor\n09/01/2026;Loja sintética;-10,50\n09/01/2026;Loja sintética;-10,50",
  );
  expect(p.rows).toHaveLength(2);
  expect(p.rows[0].amount_cents).toBe("-1050");
});
test("CSV inválido gera diagnóstico, não inventa linhas", () => {
  const p = parseCsv("data,descricao,valor\n2026-02-30,Loja,-10");
  expect(p.rows).toHaveLength(0);
  expect(p.warnings).toHaveLength(1);
});
test("OFX distingue FITID e data de lançamento", () => {
  const p = parseOfx(
    "<STMTTRN><DTPOSTED>20260109120000[-3:BRT]<TRNAMT>-10.50<FITID>synthetic-1<MEMO>Loja fictícia</STMTTRN>",
  );
  expect(p.rows[0]).toMatchObject({
    amount_cents: "-1050",
    external_key: "bank:synthetic-1",
    event_date: "2026-01-09",
  });
});
test("PDF não concatena linhas e reconhece parcela e D/C", () => {
  const p = parsePdfLines([
    "09/01/2026 Loja fictícia 03 DE 10 100,00 D",
    "10/01/2026 Estorno fictício 10,00 C",
    "11/01 Outra linha incompleta",
  ]);
  expect(p.rows).toHaveLength(2);
  expect(p.rows[0]).toMatchObject({
    amount_cents: "-10000",
    installment_index: 3,
    installment_count: 10,
  });
  expect(p.rows[1].amount_cents).toBe("1000");
  expect(p.warnings.length).toBeGreaterThan(1);
});
test("PDF sem texto reconhecido bloqueia aprovação", () => {
  expect(() => parsePdfLines(["imagem"])).toThrow(/OCR/);
});
