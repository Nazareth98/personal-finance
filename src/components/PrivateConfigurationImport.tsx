import { useState } from "react";
import { Tags } from "lucide-react";
import {
  hashPrivateConfiguration,
  parsePrivateConfiguration,
  type PrivateConfiguration,
} from "../domain/private-configuration";
import { rpc } from "../lib/api";
import { SectionTitle } from "./SectionTitle";

type ImportResult = {
  already_imported: boolean;
  categories: number;
  subcategories: number;
  rules: number;
};

export function PrivateConfigurationImport({
  refresh,
}: {
  refresh: () => Promise<void>;
}) {
  const [categoriesText, setCategoriesText] = useState("");
  const [rulesText, setRulesText] = useState("");
  const [preview, setPreview] = useState<PrivateConfiguration | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadFile(file: File | undefined, kind: "categories" | "rules") {
    setError("");
    setMessage("");
    setPreview(null);
    if (!file) return;
    try {
      const content = await file.text();
      const nextCategories = kind === "categories" ? content : categoriesText;
      const nextRules = kind === "rules" ? content : rulesText;
      if (kind === "categories") setCategoriesText(content);
      else setRulesText(content);
      if (nextCategories && nextRules) {
        setPreview(parsePrivateConfiguration(nextCategories, nextRules));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível validar os arquivos.");
    }
  }

  async function importConfiguration() {
    if (!preview) return;
    if (!window.confirm(
      `Importar ${preview.categoryCount} categorias, ${preview.subcategoryCount} subcategorias e ${preview.rules.length} regras para o seu workspace? Regras sinalizadas continuarão exigindo revisão manual.`,
    )) return;
    setBusy(true);
    setError("");
    setMessage("Importando configuração privada…");
    try {
      const sourceHash = await hashPrivateConfiguration(categoriesText, rulesText);
      const result = await rpc<ImportResult>("import_private_configuration", {
        p_categories: { items: preview.categories },
        p_rules: { items: preview.rules },
        p_source_hash: sourceHash,
      });
      await refresh();
      setMessage(result.already_imported
        ? "Este pacote já havia sido importado para seu workspace."
        : `Importação concluída: ${result.categories} categorias, ${result.subcategories} subcategorias e ${result.rules} regras.`);
    } catch {
      setMessage("");
      setError("Não foi possível importar. Confira se a migration está aplicada e se sua sessão está autenticada.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="workflow-section private-import-section">
      <SectionTitle icon={Tags} title="Importar categorias e regras privadas" description="Arquivos lidos no navegador e enviados somente ao workspace autenticado." help={<><p>Selecione os dois arquivos JSON do seu pacote de categorias e regras. A prévia mostra quantidades sem revelar palavras-chave.</p><p>Confira e confirme para importar no espaço da sua sessão. Depois, as regras ativas podem sugerir categorias na revisão; elas não definem a natureza financeira.</p></>} />
      <p>Os arquivos são lidos no navegador e enviados apenas ao workspace da sua sessão autenticada. A prévia mostra contagens, sem exibir palavras-chave.</p>
      <p className="form-required-note">Selecione os dois arquivos para validar o pacote.</p>
      <label>
        <span>Arquivo de categorias (.json)<span className="required-marker" aria-hidden="true"> *</span></span>
        <input type="file" accept="application/json,.json" disabled={busy} onChange={(e) => void loadFile(e.target.files?.[0], "categories")} />
      </label>
      <label>
        <span>Arquivo de regras (.json)<span className="required-marker" aria-hidden="true"> *</span></span>
        <input type="file" accept="application/json,.json" disabled={busy} onChange={(e) => void loadFile(e.target.files?.[0], "rules")} />
      </label>
      {preview && (
        <>
          <div className="configuration-preview">
          <h3>Prévia validada</h3>
          <p>{preview.categoryCount} categorias · {preview.subcategoryCount} subcategorias · {preview.rules.length} regras</p>
          <p>{preview.rulesRequiringNatureReview} regras exigem revisão manual da natureza financeira. A regra nunca define a natureza do lançamento.</p>
          <button disabled={busy} onClick={() => void importConfiguration()}>{busy ? "Importando…" : "Confirmar importação no meu workspace"}</button>
          </div>
        </>
      )}
      {error && <p className="notice" role="alert">{error}</p>}
      <p role="status">{message}</p>
    </section>
  );
}
