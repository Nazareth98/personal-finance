import { supabase } from "./supabase";
import type { Snapshot } from "../domain/finance";
export async function rpc<T>(
  name: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await supabase!.rpc(name, args);
  if (error)
    throw new Error(
      "Operação recusada. Verifique os campos e os vínculos; seus dados não foram alterados.",
    );
  return data as T;
}
export async function snapshot(): Promise<Snapshot> {
  return rpc<Snapshot>("workspace_snapshot");
}
export async function save(
  table: string,
  values: Record<string, unknown>,
  id?: string,
): Promise<void> {
  const result = id
    ? await supabase!.from(table).update(values).eq("id", id)
    : await supabase!.from(table).insert(values);
  if (result.error)
    throw new Error(
      "Não foi possível salvar. Confira valores, duplicidades e vínculos.",
    );
}
export function downloadJson(value: unknown, name: string) {
  downloadText(JSON.stringify(value, null, 2), name, "application/json");
}
export function downloadText(
  value: string,
  name: string,
  type = "text/csv;charset=utf-8",
) {
  const blob = new Blob([value], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
