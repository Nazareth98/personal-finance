import { useLayoutEffect, type RefObject } from 'react';

const GAP = 4, EDGE = 8;

/**
 * Camada flutuante (lista de select, menu) na top layer via `popover="manual"`: fica acima de um `<dialog>`
 * aberto e não é cortada por `overflow` de modal ou sidebar — z-index não alcança a top layer.
 * Posição fixa pela âncora: abaixo, ou acima quando falta espaço; presa às bordas da tela.
 */
export function useFloatingLayer(open: boolean, anchorRef: RefObject<HTMLElement | null>, layerRef: RefObject<HTMLElement | null>, matchWidth = false): void {
  useLayoutEffect(() => {
    const layer = layerRef.current, anchor = anchorRef.current;
    if (!open || !layer || !anchor) return;
    try { layer.showPopover?.(); } catch { /* sem suporte a popover: segue como camada fixa com z-index */ }

    const place = () => {
      const rect = anchor.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth, viewportHeight = window.innerHeight;
      if (matchWidth) layer.style.width = `${rect.width}px`;
      layer.style.maxHeight = '';
      const height = layer.offsetHeight, width = layer.offsetWidth;
      const below = viewportHeight - rect.bottom - GAP - EDGE, above = rect.top - GAP - EDGE;
      const down = height <= below || below >= above;
      const room = Math.max(0, down ? below : above);
      if (height > room) layer.style.maxHeight = `${room}px`;
      layer.style.top = `${down ? rect.bottom + GAP : rect.top - GAP - Math.min(height, room)}px`;
      layer.style.left = `${Math.max(EDGE, Math.min(rect.left, viewportWidth - width - EDGE))}px`;
    };
    place();
    // Rolagem em qualquer contêiner (corpo do modal, página) move a âncora; captura pega todas.
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
      try { layer.hidePopover?.(); } catch { /* já fechada */ }
    };
  }, [open, anchorRef, layerRef, matchWidth]);
}
