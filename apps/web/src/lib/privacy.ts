/**
 * Ocultar valores (D-049): interruptor global, salvo neste aparelho. `formatCentsBRL` consulta este
 * estado; formulários usam `formatCentsPlain`, que sempre mostra o número para edição.
 */
const STORAGE_KEY = 'pf-hide-values';
export const HIDDEN_AMOUNT = 'R$ •••••';
const listeners = new Set<() => void>();

function readStored(): boolean {
  try { return globalThis.localStorage?.getItem(STORAGE_KEY) === '1'; } catch { return false; }
}

let hidden = readStored();

export function valuesHidden(): boolean { return hidden; }

export function setValuesHidden(next: boolean): void {
  if (next === hidden) return;
  hidden = next;
  try { globalThis.localStorage?.setItem(STORAGE_KEY, next ? '1' : '0'); } catch { /* sem armazenamento: vale só nesta sessão */ }
  listeners.forEach(listener => listener());
}

export function subscribeValuesHidden(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
