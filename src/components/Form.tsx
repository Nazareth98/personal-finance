import { useState, type FormEvent, type ReactNode } from "react";
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
    <form onSubmit={handle} className="entry-form">
      <div className="form-grid">
        {fields.map((f) => (
          <label key={f.name}>
            {f.label}
            {f.options ? (
              <select
                name={f.name}
                aria-label={f.label}
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
                aria-label={f.label}
                type={f.type ?? "text"}
                defaultValue={f.value}
                required={f.required !== false}
                min={f.min}
                max={f.max}
                maxLength={500}
              />
            )}{" "}
            {f.help && <small>{f.help}</small>}
          </label>
        ))}
      </div>
      {children}
      <button disabled={busy}>{busy ? "Salvando…" : label}</button>
      <p role="status">{error}</p>
    </form>
  );
}
