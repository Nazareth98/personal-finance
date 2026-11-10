import { useId, useState, type FormEvent, type ReactNode } from "react";
export type Field = {
  name: string;
  label: string;
  type?: string;
  options?: [string, string][];
  value?: string;
  required?: boolean;
  help?: string;
  min?: string;
  max?: string;
};
export function Form({
  fields,
  submit,
  label = "Salvar",
  children,
}: {
  fields: Field[];
  submit: (v: Record<string, string>) => Promise<void>;
  label?: string;
  children?: ReactNode;
}) {
  const formId = useId();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function handle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    try {
      await submit(
        Object.fromEntries(new FormData(form).entries()) as Record<
          string,
          string
        >,
      );
      form.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={handle} className="entry-form" aria-busy={busy}>
      {fields.some((field) => field.required !== false) && (
        <p className="form-required-note">Campos com * são obrigatórios.</p>
      )}
      <div className="form-grid">
        {fields.map((f) => (
          <label key={f.name}>
            <span>{f.label}{f.required !== false && <span className="required-marker" aria-hidden="true"> *</span>}</span>
            {f.options ? (
              <select
                name={f.name}
                id={`${formId}-${f.name}`}
                aria-describedby={f.help ? `${formId}-${f.name}-help` : undefined}
                defaultValue={f.value ?? ""}
                required={f.required !== false}
              >
                <option value="">Selecione</option>
                {f.options.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                name={f.name}
                id={`${formId}-${f.name}`}
                aria-describedby={f.help ? `${formId}-${f.name}-help` : undefined}
                type={f.type ?? "text"}
                inputMode={f.type !== "number" && /R\$|%/.test(f.label) ? "decimal" : undefined}
                defaultValue={f.value}
                required={f.required !== false}
                min={f.min}
                max={f.max}
                maxLength={500}
              />
            )}{" "}
            {f.help && <small id={`${formId}-${f.name}-help`}>{f.help}</small>}
          </label>
        ))}
      </div>
      {children}
      <button disabled={busy}>{busy ? "Salvando…" : label}</button>
      {error && <p role="alert" className="form-error">{error}</p>}
    </form>
  );
}
