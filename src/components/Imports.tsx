import { useState } from "react";
import { FileUp, History, Link2, ListChecks } from "lucide-react";
import {
  brl,
  duplicateCandidates,
  suggest,
  type Snapshot,
} from "../domain/finance";
import { fileHash, parseFile, type ParseResult } from "../importers";
import { rpc } from "../lib/api";
import { TransactionForm } from "./TransactionForm";
import { SectionTitle } from "./SectionTitle";
import { ContextHelp } from "./ContextHelp";
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
  async function approveAllSafe() {
    const pendingRows = data.import_raw_rows.filter((r) => r.status === "pending");
    const safeRows = pendingRows.filter((r) => {
      const batch = data.import_batches.find((b) => b.id === r.batch_id);
      if (!batch) return false;
      const matches = duplicateCandidates(r.proposal, batch.account_id, data.transactions);
      const rule = suggest(r.proposal.description, data.categorization_rules);
      return matches.length === 0 && !rule?.requires_financial_nature_review;
    });

    if (!safeRows.length) {
      setMessage("Não há linhas pendentes sem possível duplicidade para aprovação em lote.");
      return;
    }

    if (
      !window.confirm(
        `Deseja aprovar ${safeRows.length} movimento(s) sem suspeita de duplicidade de uma só vez?`,
      )
    ) {
      return;
    }

    setBusy(true);
    setMessage(`Aprovando ${safeRows.length} movimento(s)…`);
    let confirmed = 0;
    try {
      for (const r of safeRows) {
        const rule = suggest(r.proposal.description, data.categorization_rules);
        const suggestedCategory = r.proposal.category_id ?? rule?.category_id;
        const suggestedSubcategory =
          r.proposal.subcategory_id ??
          (suggestedCategory === rule?.category_id
            ? (rule?.subcategory_id ?? undefined)
            : undefined);

        await rpc("review_import", {
          target: r.id,
          decision: "approve",
          changes: {
            ...r.proposal,
            category_id: suggestedCategory,
            subcategory_id: suggestedSubcategory,
          },
          existing: null,
        });
        confirmed += 1;
      }
      await refresh();
      setMessage(`${safeRows.length} movimento(s) aprovado(s) com sucesso.`);
    } catch {
      await refresh().catch(() => undefined);
      setMessage(`Não foi possível concluir a aprovação em lote. ${confirmed} movimento(s) tiveram resposta confirmada. A última tentativa também pode ter sido concluída. Confira a lista atualizada ou recarregue a página antes de tentar novamente.`);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="workflow-section">
        <SectionTitle icon={FileUp} title="Importar arquivo" description="A prévia é processada no navegador; confira conta, totais e avisos antes de enviar para revisão." help={<><p>Cadastre uma conta local e escolha-a como destino. Selecione um arquivo CSV, OFX, QFX, XLSX ou PDF digital; arquivos XLS precisam ser convertidos para XLSX.</p><p>A leitura ocorre no navegador. Confira a prévia, os totais e os avisos e confirme o envio. Os movimentos ficam pendentes em Revisar antes de contabilizar.</p><p>O leitor de PDF é conservador e não reconhece imagens por OCR. Confira o resultado com o documento original.</p></>} />
        <p>
          Processamento local. Formatos: CSV, OFX, QFX, XLSX e PDF digital.
          Cabeçalhos de tabela: data, descrição, valor, competência (opcional),
          id (opcional). Valores negativos representam saídas.
        </p>
        <p className="form-required-note">Campos com * são obrigatórios para enviar o lote.</p>
        <label>
          <span>Conta de destino<span className="required-marker" aria-hidden="true"> *</span></span>
          <select value={account} required onChange={(e) => setAccount(e.target.value)}>
            <option value="">Selecione</option>
            {data.financial_accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {a.institution}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Arquivo<span className="required-marker" aria-hidden="true"> *</span></span>
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
            <div className="table-wrap data-table-wrap">
              <table className="data-table">
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
      <section className="workflow-section">
        <SectionTitle icon={ListChecks} title="Revisar antes de contabilizar" description="Confirme a natureza e possíveis duplicidades antes de aprovar cada movimento." help={<><p>Abra cada movimento para conferir valor, datas, natureza, categoria e subcategoria. Uma regra ativa pode sugerir a classificação, mas não define a natureza. Você pode consultar os dados originais da linha.</p><p>Se houver um movimento aprovado da mesma conta, data e valor, confira se é o mesmo: vincule a origem quando for igual ou aprove separadamente se for outro movimento. Você também pode ignorar a linha.</p><p>A aprovação em lote pede sua confirmação e seleciona pendentes sem candidato semelhante entre movimentos já aprovados e sem regra marcada para revisão de natureza. Ela não garante categoria, natureza ou ausência de duplicidades entre pendentes. Confira antes de confirmar.</p><p>Se o lote falhar, algumas aprovações podem ter sido registradas. Confira a lista atualizada ou recarregue a página antes de tentar novamente.</p></>} />
        <p>
          Correspondências por conteúdo exigem decisão explícita. Compras
          repetidas legítimas podem ser aprovadas separadamente. Créditos e
          intermediadores precisam de confirmação da natureza.
        </p>
        {data.import_raw_rows.some((r) => r.status === "pending") && (
          <div className="actions safe-bulk-actions">
            <button
              disabled={busy}
              onClick={() => void approveAllSafe()}
            >
              Aprovar todos sem duplicidade em lote
            </button>
          </div>
        )}
        {data.import_raw_rows
          .filter((r) => r.status === "pending")
          .map((r) => {
            const batch = data.import_batches.find((b) => b.id === r.batch_id)!;
            const isPluggy =
              batch?.parser_version === "meupluggy-v1" ||
              r.proposal.external_key?.startsWith("meupluggy:");
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
              <details className="review-item" key={r.id}>
                <summary>
                  {isPluggy && <Link2 size={16} aria-hidden="true" />}{" "}
                  {r.proposal.event_date} · {r.proposal.description} ·{" "}
                  {brl(r.proposal.amount_cents)}{" "}
                  {isPluggy ? " · Pluggy" : ""}
                  {matches.length ? " · possível duplicidade" : ""}
                </summary>
                <ContextHelp title="revisar movimento"><p>Confira natureza, datas, valor e classificação. A regra pode sugerir categoria e subcategoria, mas não define a natureza.</p><p>Se um movimento semelhante for o mesmo, vincule a origem. Se for uma compra diferente, aprove separadamente; você também pode ignorar a linha.</p></ContextHelp>
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
                  {rule?.requires_financial_nature_review && (
                    <p className="notice">
                      Esta regra exige conferir manualmente a natureza financeira antes de aprovar. A categoria sugerida não define a natureza.
                    </p>
                  )}
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
          <p className="empty-state">Nenhum movimento pendente de revisão.</p>
        )}
      </section>
      <section className="workflow-section">
        <SectionTitle icon={History} title="Histórico de lotes" description="Acompanhe o resultado das importações anteriores." help={<><p>Acompanhe os lotes enviados e a quantidade de linhas por estado. Enviar um lote não significa que seus movimentos foram aprovados.</p><p>Para decidir sobre linhas pendentes, use a seção Revisar antes de contabilizar acima.</p></>} />
        {data.import_batches.length === 0 && <p className="empty-state">Nenhum lote importado.</p>}
        {data.import_batches.map((b) => {
          const rows = data.import_raw_rows.filter((r) => r.batch_id === b.id);
          const parserLabel = b.parser_version === "meupluggy-v1" ? "Meu Pluggy" : b.parser_version;
          return (
            <article className="batch-card" key={b.id}>
              {parserLabel} ·{" "}
              {data.financial_accounts.find((a) => a.id === b.account_id)?.name}{" "}
              · {rows.length} linhas ·{" "}
              {rows.filter((r) => r.status === "pending").length} pendentes ·{" "}
              {rows.filter((r) => r.status === "approved").length} aprovadas
            </article>
          );
        })}
      </section>
    </>
  );
}
