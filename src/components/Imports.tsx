import { useState } from "react";
import {
  brl,
  duplicateCandidates,
  suggest,
  type Snapshot,
} from "../domain/finance";
import { fileHash, parseFile, type ParseResult } from "../importers";
import { rpc } from "../lib/api";
import { TransactionForm } from "./TransactionForm";
export function Imports({
  data,
  refresh,
}: {
  data: Snapshot;
  refresh: () => Promise<void>;
}) {
  const [account, setAccount] = useState(""),
    [preview, setPreview] = useState<ParseResult | null>(null),
    [hash, setHash] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [confirmed, setConfirmed] = useState(false);
  async function read(file?: File) {
    setPreview(null);
    setConfirmed(false);
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      setPreview(await parseFile(file));
      setHash(await fileHash(file));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Falha ao ler arquivo.");
    } finally {
      setBusy(false);
    }
  }
  async function stage() {
    if (!preview || !account || !confirmed) return;
    setBusy(true);
    try {
      await rpc("stage_import", {
        account,
        hash,
        parser: preview.parser,
        rows: preview.rows,
      });
      setPreview(null);
      await refresh();
      setMessage(
        "Lote enviado à revisão. Reimportações idênticas preservam as decisões anteriores.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Falha ao registrar lote.");
    } finally {
      setBusy(false);
    }
  }
  async function decide(
    target: string,
    decision: string,
    changes: Record<string, unknown> = {},
    existing: string | null = null,
  ) {
    await rpc("review_import", { target, decision, changes, existing });
    await refresh();
  }
  return (
    <>
      <section>
        <h2>Importar arquivo</h2>
        <p>
          Processamento local. Formatos: CSV, OFX, QFX, XLSX e PDF digital.
          Cabeçalhos de tabela: data, descrição, valor, competência (opcional),
          id (opcional). Valores negativos representam saídas.
        </p>
        <label>
          Conta de destino
          <select value={account} onChange={(e) => setAccount(e.target.value)}>
            <option value="">Selecione</option>
            {data.financial_accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {a.institution}
              </option>
            ))}
          </select>
        </label>
        <label>
          Arquivo
          <input
            type="file"
            accept=".csv,.ofx,.qfx,.xlsx,.pdf"
            disabled={busy}
            onChange={(e) => void read(e.target.files?.[0])}
          />
        </label>
        <p role="status">{busy ? "Processando…" : message}</p>
        {preview && (
          <>
            <h3>Prévia: {preview.rows.length} movimentos</h3>
            <p>
              Total líquido:{" "}
              {brl(
                preview.rows.reduce((s, r) => s + BigInt(r.amount_cents), 0n),
              )}
            </p>
            {preview.warnings.map((w, i) => (
              <p className="notice" key={i}>
                {w}
              </p>
            ))}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 100).map((r, i) => (
                    <tr key={i}>
                      <td>{r.event_date}</td>
                      <td>{r.description}</td>
                      <td>{brl(r.amount_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.rows.length > 100 && (
              <p>
                Exibindo as primeiras 100 linhas; todas estarão disponíveis na
                revisão.
              </p>
            )}
            <label className="check">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              Conferi a prévia, os totais e os avisos. Autorizo salvar este lote
              privado para revisão.
            </label>
            <button
              disabled={!account || !confirmed || busy}
              onClick={() => void stage()}
            >
              Enviar para revisão
            </button>
          </>
        )}
      </section>
      <section>
        <h2>Revisar antes de contabilizar</h2>
        <p>
          Correspondências por conteúdo exigem decisão explícita. Compras
          repetidas legítimas podem ser aprovadas separadamente. Créditos e
          intermediadores precisam de confirmação da natureza.
        </p>
        {data.import_raw_rows
          .filter((r) => r.status === "pending")
          .map((r) => {
            const batch = data.import_batches.find((b) => b.id === r.batch_id)!;
            const rule = suggest(
              r.proposal.description,
              data.categorization_rules,
            );
            const suggestedCategory =
              r.proposal.category_id ?? rule?.category_id;
            const suggestedSubcategory =
              r.proposal.subcategory_id ??
              (suggestedCategory === rule?.category_id
                ? (rule?.subcategory_id ?? undefined)
                : undefined);
            const matches = duplicateCandidates(
              r.proposal,
              batch.account_id,
              data.transactions,
            );
            return (
              <details key={r.id}>
                <summary>
                  {r.proposal.event_date} · {r.proposal.description} ·{" "}
                  {brl(r.proposal.amount_cents)}{" "}
                  {matches.length ? " · possível duplicidade" : ""}
                </summary>
                {(r.proposal.original_row || r.proposal.original_text) && <details><summary>Dados originais da linha</summary><pre className="raw-row">{r.proposal.original_text ?? JSON.stringify(r.proposal.original_row,null,2)}</pre></details>}
                <TransactionForm
                  data={data}
                  accountId={batch.account_id}
                  initial={{
                    ...r.proposal,
                    category_id: suggestedCategory,
                    subcategory_id: suggestedSubcategory,
                  }}
                  label="Aprovar movimento"
                  submit={(p) => decide(r.id, "approve", p)}
                >
                  {rule && <p>Sugestão pela regra: {rule.keyword}</p>}
                  {matches.length > 0 && (
                    <p className="notice">
                      Existe movimento semelhante. Aprove somente se for uma
                      compra distinta; caso contrário, vincule a origem abaixo.
                    </p>
                  )}
                </TransactionForm>
                <div className="actions">
                  <button
                    className="secondary"
                    onClick={() =>
                      void decide(r.id, "ignore").catch(() =>
                        setMessage("Não foi possível ignorar a linha."),
                      )
                    }
                  >
                    Ignorar linha
                  </button>
                  {matches.map((t) => (
                    <button
                      className="secondary"
                      key={t.id}
                      onClick={() => {
                        if (
                          window.confirm(
                            "Confirmar que esta linha representa o mesmo movimento? A categoria existente será preservada.",
                          )
                        )
                          void decide(r.id, "link", {}, t.id).catch(() =>
                            setMessage("Não foi possível vincular."),
                          );
                      }}
                    >
                      Vincular ao movimento de {t.event_date}
                    </button>
                  ))}
                </div>
              </details>
            );
          })}
        {!data.import_raw_rows.some((r) => r.status === "pending") && (
          <p>Nenhum movimento pendente.</p>
        )}
      </section>
      <section>
        <h2>Histórico de lotes</h2>
        {data.import_batches.map((b) => {
          const rows = data.import_raw_rows.filter((r) => r.batch_id === b.id);
          return (
            <p key={b.id}>
              {b.parser_version} ·{" "}
              {data.financial_accounts.find((a) => a.id === b.account_id)?.name}{" "}
              · {rows.length} linhas ·{" "}
              {rows.filter((r) => r.status === "pending").length} pendentes ·{" "}
              {rows.filter((r) => r.status === "approved").length} aprovadas
            </p>
          );
        })}
      </section>
    </>
  );
}
