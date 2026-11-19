import { useSyncExternalStore } from 'react';
import { setValuesHidden, subscribeValuesHidden, valuesHidden } from '../lib/privacy.ts';

/** Ocultar valores (D-049). Usado no topo do app: alternar re-renderiza as telas e os valores mudam juntos. */
export function useValuesHidden(): [boolean, (next: boolean) => void] {
  return [useSyncExternalStore(subscribeValuesHidden, valuesHidden, () => false), setValuesHidden];
}
