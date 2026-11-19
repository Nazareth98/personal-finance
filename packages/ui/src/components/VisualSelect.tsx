import { Check, ChevronDown } from 'lucide-react';
import { Fragment, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { FormMessage } from './FormMessage';
import { Icon } from './Icon';
import { RequiredMark, useFieldIds } from './Field';
import { useFloatingLayer } from './useFloatingLayer';

export type VisualSelectOption = {
  value: string; label: string; visual: ReactNode; disabled?: boolean;
  /** Linha secundária (período, data, conta). Entra no nome acessível da opção. */
  description?: ReactNode;
  /** Informação à direita, alinhada (valor, saldo). */
  aside?: ReactNode;
  /** Selo curto ao lado do rótulo (“Sugerida”, “Paga”). */
  badge?: { label: string; tone?: 'accent' | 'success' | 'warning' | 'neutral' };
  /** Opções consecutivas com o mesmo grupo ganham um título. */
  group?: string;
};
export type VisualSelectProps = {
  label: string;
  value: string;
  options: readonly VisualSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  hint?: string;
  error?: string;
  /** Texto do gatilho sem valor escolhido. */
  placeholder?: string;
};

function OptionBody({ option }: { option: VisualSelectOption }) {
  return <>
    <span className="ui-visual-select__visual" aria-hidden="true">{option.visual}</span>
    <span className="ui-visual-select__text">
      <span className="ui-visual-select__label">{option.label}{option.badge
        ? <span className={`ui-visual-select__badge ui-visual-select__badge--${option.badge.tone ?? 'neutral'}`}>{option.badge.label}</span> : null}</span>
      {option.description ? <span className="ui-visual-select__description">{option.description}</span> : null}
    </span>
    {option.aside ? <span className="ui-visual-select__aside">{option.aside}</span> : null}
  </>;
}

export function VisualSelect({ label, value, options, onChange, disabled, required, hint, error, placeholder = 'Selecione' }: VisualSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const generatedId = useId();
  const { controlId, hintId, errorId, description } = useFieldIds(generatedId, hint, error);
  const labelId = `${controlId}-label`, listboxId = `${controlId}-listbox`;
  const matchIndex = options.findIndex(option => option.value === value);
  const selectedIndex = matchIndex >= 0 ? matchIndex : Math.max(0, options.findIndex(option => !option.disabled));
  const selected = matchIndex >= 0 ? options[matchIndex] : undefined;
  const rich = options.some(option => option.description || option.aside);
  useFloatingLayer(open, triggerRef, listRef, true);

  useEffect(() => {
    if (!open) return;
    optionRefs.current[selectedIndex]?.focus();
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [open, selectedIndex]);

  function close(focusTrigger = false) {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  }

  function select(option: VisualSelectOption) {
    if (option.disabled) return;
    onChange(option.value);
    close(true);
  }

  function moveFocus(currentIndex: number, direction: -1 | 1) {
    for (let step = 1; step <= options.length; step += 1) {
      const nextIndex = (currentIndex + direction * step + options.length) % options.length;
      if (!options[nextIndex]?.disabled) { optionRefs.current[nextIndex]?.focus(); return; }
    }
  }

  function handleOptionKeyDown(event: KeyboardEvent<HTMLDivElement>, option: VisualSelectOption, index: number) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); moveFocus(index, event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      if (event.key === 'Home') moveFocus(-1, 1); else moveFocus(options.length, -1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault(); select(option);
    } else if (event.key === 'Escape') {
      event.preventDefault(); close(true);
    } else if (event.key === 'Tab') setOpen(false);
  }

  return <div className={['ui-field', 'ui-visual-select', rich ? 'ui-visual-select--rich' : ''].filter(Boolean).join(' ')} ref={rootRef}>
    <div className="ui-field__label-row"><span className="ui-field__label" id={labelId}>{label}</span>{required ? <RequiredMark /> : null}</div>
    <button ref={triggerRef} id={controlId} type="button" role="combobox" aria-labelledby={`${labelId} ${controlId}`}
      aria-controls={listboxId} aria-expanded={open} aria-haspopup="listbox" aria-describedby={description}
      aria-invalid={Boolean(error)} disabled={disabled} className="ui-input ui-visual-select__trigger"
      onClick={() => setOpen(current => !current)} onKeyDown={event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); }
        if (event.key === 'Escape') close();
      }}>
      <span className="ui-visual-select__value">{selected
        ? <OptionBody option={selected} />
        : <span className="ui-visual-select__placeholder">{placeholder}</span>}</span>
      <Icon icon={ChevronDown} size="sm" />
    </button>
    {open ? <div ref={listRef} id={listboxId} role="listbox" aria-labelledby={labelId} popover="manual" className="ui-floating ui-visual-select__list">
      {options.map((option, index) => <Fragment key={option.value}>
        {option.group && option.group !== options[index - 1]?.group
          ? <div role="presentation" className="ui-visual-select__group">{option.group}</div> : null}
        <div ref={node => { optionRefs.current[index] = node; }}
          role="option" aria-selected={option.value === value} aria-disabled={option.disabled || undefined}
          tabIndex={index === selectedIndex ? 0 : -1} className="ui-visual-select__option"
          onClick={() => select(option)} onKeyDown={event => handleOptionKeyDown(event, option, index)}>
          <span className="ui-visual-select__value"><OptionBody option={option} /></span>
          {option.value === value ? <Icon icon={Check} size="sm" /> : null}
        </div>
      </Fragment>)}
    </div> : null}
    {hint ? <FormMessage tone="hint" id={hintId}>{hint}</FormMessage> : null}
    {error ? <FormMessage tone="error" id={errorId}>{error}</FormMessage> : null}
  </div>;
}
