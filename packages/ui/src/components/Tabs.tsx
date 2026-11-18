import { useId, type KeyboardEvent, type ReactNode } from 'react';

export type TabItem = { id: string; label: ReactNode; className?: string };
export type TabsProps = {
  /** Nome acessível do grupo de abas. */
  label: string;
  items: readonly TabItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Conteúdo da aba selecionada. */
  children: ReactNode;
  className?: string;
  panelClassName?: string;
};

/** Abas WAI-ARIA com foco itinerante: setas, Home e End movem foco e seleção. */
export function Tabs({ label, items, selectedId, onSelect, children, className = '', panelClassName = '' }: TabsProps) {
  const base = useId();
  const tabId = (index: number) => `${base}-tab-${index}`;
  const selectedIndex = Math.max(0, items.findIndex(item => item.id === selectedId));
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = items.length - 1;
    const next = { ArrowRight: index === last ? 0 : index + 1, ArrowLeft: index === 0 ? last : index - 1, Home: 0, End: last }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    onSelect(items[next]!.id);
    document.getElementById(tabId(next))?.focus();
  };
  return <>
    <div role="tablist" aria-label={label} className={['ui-tabs', className].filter(Boolean).join(' ')}>
      {items.map((item, index) => <button key={item.id} id={tabId(index)} type="button" role="tab" aria-selected={index === selectedIndex}
        aria-controls={`${base}-panel`} tabIndex={index === selectedIndex ? 0 : -1} className={['ui-tab', item.className].filter(Boolean).join(' ')}
        onClick={() => onSelect(item.id)} onKeyDown={event => onKeyDown(event, index)}>{item.label}</button>)}
    </div>
    <div role="tabpanel" id={`${base}-panel`} aria-labelledby={tabId(selectedIndex)} className={panelClassName || undefined}>{children}</div>
  </>;
}
