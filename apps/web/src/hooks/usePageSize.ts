import { useState } from 'react';

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
const storageKey = (key: string) => `pf-page-size:${key}`;

/** Itens por página de uma tabela, lembrado neste navegador (localStorage). Valor fora da lista volta ao padrão. */
export function usePageSize(key: string, fallback: number, options: readonly number[] = PAGE_SIZE_OPTIONS) {
  const [size, setSize] = useState(() => {
    try {
      const stored = Number(localStorage.getItem(storageKey(key)));
      return options.includes(stored) ? stored : fallback;
    } catch { return fallback; }
  });
  const update = (next: number) => {
    if (!options.includes(next)) return;
    setSize(next);
    try { localStorage.setItem(storageKey(key), String(next)); } catch { /* armazenamento indisponível: vale só nesta sessão */ }
  };
  return [size, update, options] as const;
}
