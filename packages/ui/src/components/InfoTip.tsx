import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { Icon } from './Icon';

export type InfoTipProps = {
  /** O que o rótulo significa, em uma ou duas frases. */
  text: string;
  /** Nome do termo explicado; vira o nome acessível “O que é …”. */
  label: string;
  className?: string;
};

/**
 * Explicação curta ao lado de um rótulo (D-067). Abre ao tocar ou com Enter/Espaço, fecha com Esc,
 * tocando fora ou de novo no botão. Não depende de hover, para funcionar no celular.
 */
export function InfoTip({ text, label, className = '' }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLSpanElement>(null);
  const bubble = useRef<HTMLSpanElement>(null);
  // Mantém o balão inteiro na tela: desloca para dentro se passar da borda (rótulos no canto, celular).
  useLayoutEffect(() => {
    const element = bubble.current;
    if (!open || !element) return;
    element.style.setProperty('--ui-infotip-shift', '0px');
    const rect = element.getBoundingClientRect(), margin = 16;
    const shift = rect.left < margin ? margin - rect.left : rect.right > window.innerWidth - margin ? window.innerWidth - margin - rect.right : 0;
    element.style.setProperty('--ui-infotip-shift', `${Math.round(shift)}px`);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    const onPointer = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onPointer); };
  }, [open]);
  return <span ref={root} className={['ui-infotip', className].filter(Boolean).join(' ')}>
    <button type="button" className="ui-infotip__button" aria-label={`O que é ${label}`} aria-expanded={open} aria-controls={id}
      onClick={() => setOpen(value => !value)}><Icon icon={Info} size="sm" /></button>
    <span ref={bubble} id={id} role="note" className="ui-infotip__bubble" hidden={!open}>{text}</span>
  </span>;
}
