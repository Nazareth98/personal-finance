import Papa from "papaparse";
import {
  cents,
  dateSchema,
  normalize,
  proposalSchema,
  type Proposal,
} from "../domain/finance";
export interface ParseResult {
  rows: Proposal[];
  warnings: string[];
  parser: string;
}
function iso(v: string): string {
  const s = v.trim();
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  return dateSchema.parse(m ? `${m[3]}-${m[2]}-${m[1]}` : s);
}
function proposal(
  description: string,
  value: string,
  date: string,
  competence?: string,
  external_key?: string,
): Proposal {
  const amount = cents(value);
  return proposalSchema.parse({
    description: description.trim(),
    amount_cents: amount.toString(),
    event_date: iso(date),
    bank_date: iso(date),
    competence: competence
      ? `${iso(competence).slice(0, 7)}-01`
      : `${iso(date).slice(0, 7)}-01`,
    nature: amount < 0n ? "expense" : "income",
    external_key,
  });
}
export function parseCsv(text: string): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (v) => normalize(v.replace(/^\uFEFF/, "")),
  });
  if (parsed.errors.length)
    throw new Error(
      "CSV inválido: confira delimitadores, aspas e quantidade de colunas.",
    );
  const rows: Proposal[] = [],
    warnings: string[] = [];
  for (const [i, r] of parsed.data.entries()) {
    try {
      const date = r.data ?? r.date;
      const desc = r.descricao ?? r.description ?? r.title ?? r.historico;
      const amount = r.valor ?? r.amount;
      if (!date || !desc || !amount) throw new Error();
      rows.push({
        ...proposal(
          desc,
          amount,
          date,
          r.competencia || undefined,
          r.id ? `bank:${r.id}` : undefined,
        ),
        original_row: { ...r },
      });
    } catch {
      warnings.push(
        `Linha ${i + 2}: data, descrição ou valor inválido. Não foi importada.`,
      );
    }
  }
  return { rows, warnings, parser: "csv-canonical-v1" };
}
export function parseOfx(text: string): ParseResult {
  const rows: Proposal[] = [],
    warnings: string[] = [];
  const blocks = [...text.matchAll(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi)];
  for (const [i, m] of blocks.entries()) {
    const field = (tag: string) =>
      new RegExp(`<${tag}>([^<\r\n]+)`, "i").exec(m[1])?.[1]?.trim();
    try {
      const raw = field("DTPOSTED") ?? "";
      if (!/^\d{8}/.test(raw)) throw new Error();
      const d = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
      rows.push({
        ...proposal(
          field("MEMO") ?? field("NAME") ?? "Movimento OFX",
          field("TRNAMT") ?? "",
          d,
          undefined,
          field("FITID") ? `bank:${field("FITID")}` : undefined,
        ),
        original_text: m[0],
      });
    } catch {
      warnings.push(`Movimento OFX ${i + 1}: campos inválidos.`);
    }
  }
  if (!blocks.length)
    throw new Error("Nenhum movimento STMTTRN reconhecido no OFX.");
  return { rows, warnings, parser: "ofx-v1" };
}
export function parsePdfLines(lines: string[]): ParseResult {
  const rows: Proposal[] = [],
    warnings: string[] = [];
  for (const [i, line] of lines.entries()) {
    if (!/^\s*\d{2}\//.test(line)) continue;
    const m =
      /^\s*(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(-?[\d.]+,\d{2})\s*([DC])?\s*$/i.exec(
        line,
      );
    if (!m) {
      warnings.push(
        `Linha ${i + 1}: data ou estrutura incompleta. Revise o PDF original.`,
      );
      continue;
    }
    try {
      const amount =
        m[4]?.toUpperCase() === "D" ? `-${m[3].replace("-", "")}` : m[3];
      const p = proposal(m[2], amount, m[1]);
      const installment = /(\d{1,3})\s*(?:DE|\/)\s*(\d{1,3})/i.exec(m[2]);
      if (installment) {
        p.installment_index = Number(installment[1]);
        p.installment_count = Number(installment[2]);
      }
      rows.push(proposalSchema.parse({ ...p, original_text: line }));
    } catch {
      warnings.push(`Linha ${i + 1}: valor ou data inválidos.`);
    }
  }
  warnings.unshift(
    "PDF: confira direção dos valores, total, cartão e competência de cada item. Este leitor conservador não homologa layouts bancários. Linhas sem data completa não são inferidas.",
  );
  if (!rows.length)
    throw new Error(
      "PDF sem linhas reconhecidas. Pode exigir OCR ou adaptador específico; use CSV/OFX/XLSX ou registro manual. Nenhum dado foi enviado a outro serviço.",
    );
  return { rows, warnings, parser: "pdf-lines-v1" };
}
export async function parseFile(file: File): Promise<ParseResult> {
  if (file.size > 10 * 1024 * 1024)
    throw new Error("O limite é 10 MiB por arquivo.");
  const bytes = await file.arrayBuffer();
  const ext = file.name.toLowerCase().split(".").pop();
  let result: ParseResult;
  if (ext === "xlsx") {
    const { readSheet } = await import("read-excel-file/browser");
    const sheet = await readSheet(file);
    const text = Papa.unparse(
      sheet.map((row) =>
        row.map((cell) =>
          cell instanceof Date
            ? cell.toISOString().slice(0, 10)
            : String(cell ?? ""),
        ),
      ),
    );
    result = parseCsv(text);
    result.parser = "xlsx-canonical-v1";
  } else if (ext === "pdf") {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
    const task = pdfjs.getDocument({
      data: bytes,
      useSystemFonts: true,
      verbosity: 0,
    });
    const pdf = await task.promise;
    try {
      if (pdf.numPages > 100) throw new Error("PDF acima de 100 páginas.");
      const lines: string[] = [];
      for (let n = 1; n <= pdf.numPages; n++) {
        const content = await (await pdf.getPage(n)).getTextContent();
        let line = "",
          lastY: number | undefined;
        for (const item of content.items) {
          if ("str" in item) {
            const y = Math.round(item.transform[5]);
            if (lastY !== undefined && Math.abs(y - lastY) > 2) {
              lines.push(line);
              line = "";
            }
            line += `${item.str} `;
            lastY = y;
            if (item.hasEOL) {
              lines.push(line);
              line = "";
              lastY = undefined;
            }
          }
        }
        if (line) lines.push(line);
      }
      result = parsePdfLines(lines);
    } finally {
      await task.destroy();
    }
  } else {
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      text = new TextDecoder("windows-1252").decode(bytes);
    }
    if (ext === "ofx" || ext === "qfx") result = parseOfx(text);
    else if (ext === "csv") result = parseCsv(text);
    else
      throw new Error(
        "Formato não suportado. Converta XLS antigo para XLSX; aceitamos CSV, OFX, QFX, XLSX e PDF digital.",
      );
  }
  if (result.rows.length > 2000)
    throw new Error("Limite de 2000 linhas por lote. Divida o arquivo.");
  if (!result.rows.length)
    throw new Error("Nenhuma linha válida identificada.");
  return result;
}
export async function fileHash(file: File): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(hash)]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
}
