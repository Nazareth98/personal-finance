import { useCallback, useEffect, useState } from 'react';

const readParams = () => new URLSearchParams(window.location.hash.split('?')[1] ?? '');

/** Estado de filtros em `#pagina?chave=valor`; valores vazios saem da URL. */
export function useHashParams() {
  const [params, setParams] = useState(readParams);

  useEffect(() => {
    const onHashChange = () => setParams(readParams());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const update = useCallback((changes: Record<string, string | null>) => {
    const next = readParams();
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value); else next.delete(key);
    }
    const page = window.location.hash.replace(/^#/, '').split('?')[0];
    const query = next.toString();
    // replaceState não dispara hashchange: filtros não poluem o histórico nem remontam a página.
    window.history.replaceState(window.history.state, '', `#${page}${query ? `?${query}` : ''}`);
    setParams(next);
  }, []);

  return [params, update] as const;
}
