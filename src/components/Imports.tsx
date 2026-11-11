import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  FileUp,
  History,
  Link2,
  ListChecks,
} from "lucide-react";
import {
  brl,
  duplicateCandidates,
  natureLabels,
  pendingDuplicateCandidates,
  reviewReasonLabels,
  suggest,
  type ImportProcessingResult,
  type ReviewReason,
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
    [confirmed, setConfirmed] = useState(false),
    [reasonFilter, setReasonFilter] = useState<ReviewReason | "all">("all"),
    [visibleCount, setVisibleCount] = useState(50);
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
      const batchId = await rpc<string>("stage_import", {
        account,
        hash,
        parser: preview.parser,
        rows: preview.rows,
      });
      setPreview(null);
      try {
        const result = await rpc<ImportProcessingResult>("process_imports", {
          target_batch: batchId,
        });
        await refresh();
        setMessage(
          `Lote processado: ${result.approved} aprovado(s) automaticamente, ${result.linked} duplicidade(s) vinculada(s) e ${result.pending} pendente(s) para revisão.`,
        );
      } catch {
        await refresh().catch(() => undefined);
        setMessage(
          "O lote foi salvo, mas o processamento automático não foi concluído. Reprocesse as pendências antes de importar novamente.",
        );
      }
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
  async function reprocessPending() {
    setBusy(true);
    setMessage("Reavaliando pendências com as regras atuais…");
    try {
      const result = await rpc<ImportProcessingResult>("process_imports", {
        target_batch: null,
      });
      await refresh();
      setMessage(
        `Reprocessamento concluído: ${result.approved} aprovado(s), ${result.linked} vinculado(s) e ${result.pending} ainda pendente(s).`,
      );
    } catch {
      await refresh().catch(() => undefined);
      setMessage(
        "Não foi possível reprocessar as pendências. Nenhuma decisão parcial deste processamento foi confirmada.",
      );
    } finally {
      setBusy(false);
    }
  }
  const pendingItems = useMemo(
    () =>
      data.import_raw_rows
        .filter((row) => row.status === "pending")
        .map((row) => {
          const batch = data.import_batches.find((item) => item.id === row.batch_id)!;
          const rule = suggest(row.proposal.description, data.categorization_rules, {
            accountId: batch?.account_id,
            amountCents: row.proposal.amount_cents,
          });
          const categoryId = row.proposal.category_id ?? rule?.category_id;
          const subcategoryId =
            row.proposal.subcategory_id ??
            (categoryId === rule?.category_id ? (rule?.subcategory_id ?? undefined) : undefined);
          const nature = rule?.transaction_nature ?? row.proposal.nature;
          const counterpartAccountId =
            row.proposal.counterpart_account_id ?? rule?.counterpart_account_id ?? undefined;
          const matches = batch
            ? duplicateCandidates(row.proposal, batch.account_id, data.transactions)
            : [];
          const pendingMatches = batch
            ? pendingDuplicateCandidates(row, batch, data.import_raw_rows, data.import_batches)
            : [];
          let reason = row.review_reason;
          if (!reason && (matches.length || pendingMatches.length)) reason = "possible_duplicate";
          if (!reason && !rule) reason = "no_automation_rule";
          if (!reason && rule?.requires_financial_nature_review) reason = "nature_review_required";
          if (!reason && !rule?.auto_approve) reason = "automation_disabled";
          return {
            row,
            batch,
            rule,
            matches,
            pendingMatches,
            reason: reason ?? "no_automation_rule",
            proposal: {
              ...row.proposal,
              nature,
              category_id: categoryId,
              subcategory_id: subcategoryId,
              counterpart_account_id: counterpartAccountId,
            },
          };
        }),
    [data],
  );
  const reasonCounts = useMemo(
    () =>
      pendingItems.reduce<Partial<Record<ReviewReason, number>>>((counts, item) => {
        counts[item.reason] = (counts[item.reason] ?? 0) + 1;
        return counts;
      }, {}),
    [pendingItems],
  );
  const filteredPendingItems = pendingItems.filter(
    (item) => reasonFilter === "all" || item.reason === reasonFilter,
  );
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
          <span>Conta observada no extrato<span className="required-marker" aria-hidden="true"> *</span></span>
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
        <SectionTitle icon={ListChecks} title="Revisar antes de contabilizar" description="Veja por que cada movimento exige decisão e confira o contexto completo antes de aprovar." help={<><p>Cada cartão mostra o motivo da pendência, a conta observada, direção, datas, tipo sugerido e classificação. Abra o item para corrigir os campos e decidir.</p><p>Regras com aprovação automática só contabilizam itens completos e sem possível duplicidade. Aporte, resgate, transferência e pagamento exigem uma conta de contrapartida.</p><p>Identificadores bancários repetidos podem ser vinculados automaticamente. Coincidências apenas por data e valor continuam exigindo decisão porque compras legítimas podem se repetir.</p></>} />
        <p>
          A fila contém somente exceções. Reprocessar aplica as regras atuais em
          uma transação no servidor; itens ambíguos continuam pendentes.
        </p>
        {pendingItems.length > 0 && (
          <>
            <div className="review-toolbar">
              <label>
                Motivo da pendência
                <select
                  value={reasonFilter}
                  onChange={(event) => {
                    setReasonFilter(event.target.value as ReviewReason | "all");
                    setVisibleCount(50);
                  }}
                >
                  <option value="all">Todos ({pendingItems.length})</option>
                  {Object.entries(reviewReasonLabels)
                    .filter(([reason]) => reasonCounts[reason as ReviewReason])
                    .map(([reason, label]) => (
                      <option value={reason} key={reason}>
                        {label} ({reasonCounts[reason as ReviewReason]})
                      </option>
                    ))}
                </select>
              </label>
              <button disabled={busy} onClick={() => void reprocessPending()}>
                Reprocessar com as regras atuais
              </button>
            </div>
            <p className="muted" aria-live="polite">
              Exibindo {Math.min(visibleCount, filteredPendingItems.length)} de{" "}
              {filteredPendingItems.length} pendência(s) neste filtro.
            </p>
          </>
        )}
        {filteredPendingItems.slice(0, visibleCount).map((item) => {
          const {
            row,
            batch,
            rule,
            matches,
            pendingMatches,
            reason,
            proposal,
          } = item;
          const observedAccount = data.financial_accounts.find(
            (account) => account.id === batch?.account_id,
          );
          const counterpart = data.financial_accounts.find(
            (account) => account.id === proposal.counterpart_account_id,
          );
          const category = data.categories.find(
            (candidate) => candidate.id === proposal.category_id,
          );
          const subcategory = data.subcategories.find(
            (candidate) => candidate.id === proposal.subcategory_id,
          );
          const isCredit = BigInt(proposal.amount_cents) > 0n;
          const isPluggy =
            batch?.parser_version === "meupluggy-v1" ||
            proposal.external_key?.startsWith("meupluggy:");
          return (
            <details className="review-item" key={row.id}>
              <summary className="review-summary">
                <div className="review-summary-heading">
                  <span className="status-badge review-reason">
                    <AlertTriangle size={15} aria-hidden="true" />
                    {reviewReasonLabels[reason]}
                  </span>
                  {isPluggy && (
                    <span className="status-badge">
                      <Link2 size={15} aria-hidden="true" /> Meu Pluggy
                    </span>
                  )}
                </div>
                <div className="review-summary-title">
                  <strong>{proposal.description}</strong>
                  <span
                    className={`financial-amount ${isCredit ? "positive" : "negative"}`}
                  >
                    {isCredit ? (
                      <ArrowDownLeft size={18} aria-hidden="true" />
                    ) : (
                      <ArrowUpRight size={18} aria-hidden="true" />
                    )}
                    {brl(proposal.amount_cents)}
                  </span>
                </div>
                <dl className="review-decision-grid">
                  <div><dt>Conta observada</dt><dd>{observedAccount?.name ?? "Conta indisponível"}</dd></div>
                  <div><dt>Direção</dt><dd>{isCredit ? "Entrada" : "Saída"}</dd></div>
                  <div><dt>Tipo sugerido</dt><dd>{natureLabels[proposal.nature]}</dd></div>
                  <div><dt>Data bancária</dt><dd>{proposal.bank_date}</dd></div>
                  <div><dt>Competência</dt><dd>{proposal.competence.slice(0, 7)}</dd></div>
                  <div><dt>Categoria</dt><dd>{category?.name ?? "Não preenchida"}</dd></div>
                  <div><dt>Subcategoria</dt><dd>{subcategory?.name ?? "Não preenchida"}</dd></div>
                  <div><dt>Contrapartida</dt><dd>{counterpart?.name ?? "Não se aplica ou não preenchida"}</dd></div>
                </dl>
              </summary>
              <div className="review-item-body">
                <ContextHelp title="revisar movimento"><p>Use o motivo da pendência para localizar o campo que falta. Confira a conta observada e a direção antes de escolher aporte ou resgate.</p><p>Se um movimento aprovado for o mesmo evento, vincule a origem. Se for um evento distinto, aprove separadamente.</p></ContextHelp>
                {rule && (
                  <p className="review-rule-context">
                    Regra correspondente: <strong>{rule.keyword}</strong>.{" "}
                    {rule.auto_approve
                      ? "A automação foi bloqueada pelo motivo indicado acima."
                      : "A regra está configurada para revisão manual."}
                  </p>
                )}
                {(matches.length > 0 || pendingMatches.length > 0) && (
                  <div className="notice duplicate-context">
                    <strong>Movimentos semelhantes encontrados</strong>
                    <ul>
                      {matches.map((transaction) => (
                        <li key={transaction.id}>
                          Aprovado: {transaction.event_date} · {transaction.description} ·{" "}
                          {brl(transaction.amount_cents)}
                        </li>
                      ))}
                      {pendingMatches.map((candidate) => (
                        <li key={candidate.id}>
                          Pendente anterior: {candidate.proposal.event_date} ·{" "}
                          {candidate.proposal.description} · {brl(candidate.proposal.amount_cents)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(proposal.original_row || proposal.original_text) && (
                  <details>
                    <summary>Dados originais da linha</summary>
                    <pre className="raw-row">
                      {proposal.original_text ?? JSON.stringify(proposal.original_row, null, 2)}
                    </pre>
                  </details>
                )}
                <TransactionForm
                  data={data}
                  accountId={batch.account_id}
                  initial={proposal}
                  label="Aprovar movimento"
                  submit={(changes) => decide(row.id, "approve", changes)}
                />
                <div className="actions">
                  <button
                    className="secondary"
                    onClick={() =>
                      void decide(row.id, "ignore").catch(() =>
                        setMessage("Não foi possível ignorar a linha."),
                      )
                    }
                  >
                    Ignorar linha
                  </button>
                  {matches.map((transaction) => (
                    <button
                      className="secondary"
                      key={transaction.id}
                      onClick={() => {
                        if (
                          window.confirm(
                            "Confirmar que esta linha representa o mesmo movimento? A classificação existente será preservada.",
                          )
                        )
                          void decide(row.id, "link", {}, transaction.id).catch(() =>
                            setMessage("Não foi possível vincular."),
                          );
                      }}
                    >
                      Vincular ao aprovado de {transaction.event_date}
                    </button>
                  ))}
                </div>
              </div>
            </details>
          );
        })}
        {filteredPendingItems.length > visibleCount && (
          <button
            className="secondary"
            onClick={() => setVisibleCount((count) => count + 50)}
          >
            Mostrar mais 50 pendências
          </button>
        )}
        {pendingItems.length === 0 && (
          <p className="empty-state">Nenhum movimento pendente de revisão.</p>
        )}
        {pendingItems.length > 0 && filteredPendingItems.length === 0 && (
          <p className="empty-state">Nenhuma pendência com este motivo.</p>
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
