import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { rpc } from "../lib/api";
import { SectionTitle } from "./SectionTitle";
type Report = {
  total: number;
  new: number;
  existing: number;
  applied: boolean;
};
export function Restore({ refresh }: { refresh: () => Promise<void> }) {
  const [backup, setBackup] = useState<unknown>(),
    [report, setReport] = useState<Report>(),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function preview(file?: File) {
    setReport(undefined);
    setBackup(undefined);
    if (!file) return;
    setBusy(true);
    try {
      if (file.size > 10 * 1024 * 1024)
        throw new Error("Limite de 10 MiB no navegador.");
      const parsed: unknown = JSON.parse(await file.text());
      const result = await rpc<Report>("restore_backup", {
        backup: parsed,
        confirmed: false,
      });
      setBackup(parsed);
      setReport(result);
      setMessage(
        "Prévia validada. A confirmação executará as constraints e vínculos de forma atômica.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Backup inválido.");
    } finally {
      setBusy(false);
    }
  }
  async function restore() {
    if (
      !report ||
      !window.confirm(
        `Restaurar ${report.new} registros ausentes no seu workspace? Registros existentes não serão substituídos. Conexões recuperadas ficarão revogadas.`,
      )
    )
      return;
    setBusy(true);
    try {
      const result = await rpc<Report>("restore_backup", {
        backup,
        confirmed: true,
      });
      setReport(result);
      await refresh();
      setMessage(
        "Restauração concluída. Nenhum registro existente foi substituído.",
      );
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Restauração recusada; nenhuma alteração parcial.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="workflow-section restore-section">
      <SectionTitle icon={RotateCcw} title="Restaurar backup" description="A prévia valida o arquivo; a confirmação adiciona registros ausentes sem substituir os existentes." help={<><p>Selecione um backup JSON exportado deste mesmo espaço. A prévia valida o arquivo no seu Supabase sem gravar dados.</p><p>Após sua confirmação, somente registros ausentes são adicionados de forma atômica; existentes não são substituídos. Conexões recuperadas ficam revogadas e precisam ser conectadas novamente.</p><p>O arquivo pode conter dados financeiros privados. Use somente seu próprio backup e guarde-o em local protegido.</p></>} />
      <p>
        Aceita apenas exportação deste mesmo workspace. Não mistura dados de
        pessoas diferentes e não sobrescreve registros alterados. A prévia envia
        o JSON somente ao seu Supabase para validação; a gravação exige
        confirmação.
      </p>
      <label>
        <span>Backup JSON<span className="required-marker" aria-hidden="true"> *</span></span>
        <input
          type="file"
          accept=".json"
          required
          disabled={busy}
          onChange={(e) => void preview(e.target.files?.[0])}
        />
      </label>
      {report && (
        <>
          <p>Prévia validada: {report.total} registros no arquivo.</p>
          <button
            disabled={busy || report.applied}
            onClick={() => void restore()}
          >
            Confirmar restauração
          </button>
        </>
      )}
      {report && <div className="restore-summary"><strong>{report.new}</strong><span>registros ausentes</span><strong>{report.existing}</strong><span>já existentes</span></div>}
      {message && <p role="status" className="inline-feedback">{message}</p>}
    </section>
  );
}
