import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { FormMessage } from './FormMessage';
import { Icon } from './Icon';
import { useFieldIds } from './Field';

export type VisualSelectOption = { value: string; label: string; visual: ReactNode; disabled?: boolean };
export type VisualSelectProps = {
  label: string;
  value: string;
  options: readonly VisualSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  hint?: string;
  error?: string;
};

export function VisualSelect({ label, value, options, onChange, disabled, required, hint, error }: VisualSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const generatedId = useId();
  const { controlId, hintId, errorId, description } = useFieldIds(generatedId, hint, error);
  const labelId = `${controlId}-label`, listboxId = `${controlId}-listbox`;
  const selectedIndex = Math.max(0, options.findIndex(option => option.value === value));
  const selected = options[selectedIndex];

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

  return <div className="ui-field ui-visual-select" ref={rootRef}>
    <span className="ui-field__label" id={labelId}>{label}{required ? <span aria-hidden="true"> *</span> : null}</span>
    <button ref={triggerRef} id={controlId} type="button" role="combobox" aria-labelledby={`${labelId} ${controlId}`}
      aria-controls={listboxId} aria-expanded={open} aria-haspopup="listbox" aria-describedby={description}
      aria-invalid={Boolean(error)} disabled={disabled} className="ui-input ui-visual-select__trigger"
      onClick={() => setOpen(current => !current)} onKeyDown={event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); }
        if (event.key === 'Escape') close();
      }}>
      <span className="ui-visual-select__value"><span className="ui-visual-select__visual" aria-hidden="true">{selected?.visual}</span>{selected?.label}</span>
      <Icon icon={ChevronDown} size="sm" />
    </button>
    {open ? <div id={listboxId} role="listbox" aria-labelledby={labelId} className="ui-visual-select__list">
      {options.map((option, index) => <div key={option.value} ref={node => { optionRefs.current[index] = node; }}
        role="option" aria-selected={option.value === value} aria-disabled={option.disabled || undefined}
        tabIndex={option.value === value ? 0 : -1} className="ui-visual-select__option"
        onClick={() => select(option)} onKeyDown={event => handleOptionKeyDown(event, option, index)}>
        <span className="ui-visual-select__value"><span className="ui-visual-select__visual" aria-hidden="true">{option.visual}</span>{option.label}</span>
        {option.value === value ? <Icon icon={Check} size="sm" /> : null}
      </div>)}
    </div> : null}
    {hint ? <FormMessage tone="hint" id={hintId}>{hint}</FormMessage> : null}
    {error ? <FormMessage tone="error" id={errorId}>{error}</FormMessage> : null}
  </div>;
}
