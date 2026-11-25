import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { FormMessage } from './FormMessage';
import { Icon } from './Icon';
import { RequiredMark } from './Field';
import { useFloatingLayer } from './useFloatingLayer';

/**
 * Seletor de data do Design System (D-082): mesma caixa do Input, texto dd/mm/aaaa digitável e calendário próprio
 * no lugar do nativo. Valor em ISO (`AAAA-MM-DD`, '' sem data), sem fuso. No celular (≤ 680 px) o calendário vira folha inferior.
 */
export type DateFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  error?: string;
  /** Primeiro e último dia escolhíveis (ISO). */
  min?: string;
  max?: string;
  /** Mostra o X para limpar (campos opcionais). */
  clearable?: boolean;
  id?: string;
};

import { MONTHS, WEEKDAYS, formatDateBR, fromIso, isIso, maskDateBR, parseDateBR, toIso, weekdayLabel } from './date-format';
export { formatDateBR, maskDateBR, parseDateBR } from './date-format';

function monthGrid(year: number, month: number): Date[] {
  const start = new Date(year, month, 1 - new Date(year, month, 1).getDay());
  const days = Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
  return days[35]!.getMonth() !== month ? days.slice(0, 35) : days;
}

function useSheet(): boolean {
  const query = '(max-width: 680px)';
  const [sheet, setSheet] = useState(() => typeof window !== 'undefined' && Boolean(window.matchMedia?.(query).matches));
  useEffect(() => {
    const media = window.matchMedia?.(query);
    if (!media) return;
    const update = () => setSheet(media.matches);
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);
  return sheet;
}

export function DateField({ label, value, onChange, required, disabled, hint, error, min, max, clearable, id }: DateFieldProps) {
  const generated = useId();
  const inputId = id ?? generated;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = `${inputId}-error`;
  const weekdayId = `${inputId}-weekday`;
  const today = toIso(new Date());
  const [text, setText] = useState(formatDateBR(value));
  const [typedError, setTypedError] = useState('');
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState(value && isIso(value) ? value : today);
  const wrapRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dayRefs = useRef(new Map<string, HTMLButtonElement>());
  const sheet = useSheet();
  useFloatingLayer(open, wrapRef, layerRef);

  useEffect(() => { setText(formatDateBR(value)); setTypedError(''); }, [value]);
  useEffect(() => { if (open) dayRefs.current.get(focus)?.focus(); }, [open, focus]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!wrapRef.current?.contains(target) && !layerRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  const allowed = (iso: string) => (!min || iso >= min) && (!max || iso <= max);
  const close = () => { setOpen(false); buttonRef.current?.focus(); };
  function choose(iso: string) {
    if (!allowed(iso)) return;
    onChange(iso);
    setText(formatDateBR(iso));
    setTypedError('');
    if (sheet) setFocus(iso); else close();
  }
  function openCalendar() {
    setFocus(value && isIso(value) ? value : max && today > max ? max : today);
    setOpen(true);
  }
  function commitText(next: string) {
    if (!next) { setTypedError(''); if (value) onChange(''); return; }
    const iso = parseDateBR(next);
    if (!iso) { setTypedError(next.length < 10 ? 'Complete a data: dd/mm/aaaa.' : 'Data inválida.'); return; }
    if (!allowed(iso)) {
      setTypedError(max && iso > max ? `Escolha até ${formatDateBR(max)}.` : `Escolha a partir de ${formatDateBR(min!)}.`);
      return;
    }
    setTypedError('');
    if (iso !== value) onChange(iso);
  }
  function move(event: KeyboardEvent<HTMLButtonElement>) {
    const date = fromIso(focus);
    const step: Record<string, () => void> = {
      ArrowLeft: () => date.setDate(date.getDate() - 1), ArrowRight: () => date.setDate(date.getDate() + 1),
      ArrowUp: () => date.setDate(date.getDate() - 7), ArrowDown: () => date.setDate(date.getDate() + 7),
      PageUp: () => date.setMonth(date.getMonth() - 1), PageDown: () => date.setMonth(date.getMonth() + 1),
      Home: () => date.setDate(date.getDate() - date.getDay()), End: () => date.setDate(date.getDate() + 6 - date.getDay())
    };
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (!step[event.key]) return;
    event.preventDefault();
    step[event.key]!();
    setFocus(toIso(date));
  }

  const focusDate = fromIso(focus);
  const year = focusDate.getFullYear(), month = focusDate.getMonth();
  const shiftMonth = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    const day = Math.min(focusDate.getDate(), new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate());
    setFocus(toIso(new Date(next.getFullYear(), next.getMonth(), day)));
  };
  const shownError = error || typedError;
  const validValue = value && isIso(value) ? value : '';
  const limitNote = max === today ? 'Datas futuras indisponíveis' : max ? `Até ${formatDateBR(max)}` : min ? `A partir de ${formatDateBR(min)}` : '';
  const description = [validValue && !shownError ? weekdayId : '', hintId, shownError ? errorId : ''].filter(Boolean).join(' ') || undefined;

  return <div className="ui-field ui-date-field">
    <div className="ui-field__label-row"><label htmlFor={inputId} className="ui-field__label">{label}</label>{required ? <RequiredMark /> : null}</div>
    <div ref={wrapRef} className={`ui-input-wrap ui-date-field__wrap${clearable && text ? ' ui-date-field__wrap--clear' : ''}`}>
      <input id={inputId} className="ui-input" inputMode="numeric" autoComplete="off" placeholder="dd/mm/aaaa" maxLength={10}
        value={text} required={required} disabled={disabled} aria-invalid={Boolean(shownError)} aria-describedby={description}
        onChange={event => { const next = maskDateBR(event.target.value); setText(next); if (next.length === 10) commitText(next); else setTypedError(''); }}
        onBlur={() => commitText(text)}
        onKeyDown={event => { if (event.key === 'ArrowDown' && event.altKey) { event.preventDefault(); openCalendar(); } }} />
      <span className="ui-input-wrap__trailing ui-date-field__actions">
        {clearable && text && !disabled ? <button type="button" className="ui-date-field__icon-button" aria-label={`Limpar ${label.toLowerCase()}`}
          onClick={() => { setText(''); setTypedError(''); onChange(''); }}><Icon icon={X} size="sm" /></button> : null}
        <button ref={buttonRef} type="button" className="ui-date-field__icon-button" disabled={disabled}
          aria-label={`Abrir calendário de ${label.toLowerCase()}`} aria-haspopup="dialog" aria-expanded={open}
          onClick={() => open ? close() : openCalendar()}><Icon icon={CalendarDays} size="sm" /></button>
      </span>
    </div>
    {validValue && !shownError ? <p id={weekdayId} className="ui-field__hint ui-date-field__weekday">{weekdayLabel(validValue)}</p> : null}
    {hint ? <p id={hintId} className="ui-field__hint">{hint}</p> : null}
    {shownError ? <FormMessage id={errorId} tone="error" className="ui-field__error">{shownError}</FormMessage> : null}
    {open ? <div ref={layerRef} popover="manual" role="dialog" aria-modal={sheet || undefined} aria-label={`Escolher ${label.toLowerCase()}`}
      className={`ui-floating ui-date-calendar${sheet ? ' ui-date-calendar--sheet' : ''}`}>
      {sheet ? <div className="ui-date-calendar__sheet-head">
        <div><strong>{label}</strong><p>{validValue ? weekdayLabel(validValue) : 'Escolha um dia'}</p></div>
        <button type="button" className="ui-date-field__icon-button ui-date-field__icon-button--lg" aria-label="Fechar" onClick={close}><Icon icon={X} size="md" /></button>
      </div> : null}
      <div className="ui-date-calendar__body">
        <div className="ui-date-calendar__nav">
          <button type="button" className="ui-date-field__icon-button" aria-label="Mês anterior" onClick={() => shiftMonth(-1)}><Icon icon={ChevronLeft} size="sm" /></button>
          <strong aria-live="polite">{MONTHS[month]} de {year}</strong>
          <button type="button" className="ui-date-field__icon-button" aria-label="Próximo mês" onClick={() => shiftMonth(1)}><Icon icon={ChevronRight} size="sm" /></button>
        </div>
        <div className="ui-date-calendar__grid" role="grid" aria-label={`${MONTHS[month]} de ${year}`}>
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => <abbr key={index} title={WEEKDAYS[index]} className="ui-date-calendar__weekday">{day}</abbr>)}
          {monthGrid(year, month).map(date => {
            const iso = toIso(date);
            const outside = date.getMonth() !== month, blocked = !allowed(iso);
            return <button key={iso} type="button" ref={node => { if (node) dayRefs.current.set(iso, node); else dayRefs.current.delete(iso); }}
              className={['ui-date-calendar__day', outside ? 'is-outside' : '', iso === today ? 'is-today' : '', iso === validValue ? 'is-selected' : ''].filter(Boolean).join(' ')}
              tabIndex={iso === focus ? 0 : -1} aria-pressed={iso === validValue} aria-disabled={blocked || undefined}
              aria-label={`${date.getDate()} de ${MONTHS[date.getMonth()]} de ${date.getFullYear()}${iso === today ? ', hoje' : ''}`}
              onClick={() => choose(iso)} onKeyDown={move}>{date.getDate()}</button>;
          })}
        </div>
      </div>
      <div className="ui-date-calendar__footer">
        <button type="button" className={sheet ? 'ui-button ui-button--secondary ui-button--lg' : 'ui-button ui-button--ghost ui-button--sm'}
          disabled={!allowed(today)} onClick={() => choose(today)}>Hoje</button>
        {sheet ? <button type="button" className="ui-button ui-button--primary ui-button--lg" onClick={close}>Confirmar</button>
          : limitNote ? <span className="ui-date-calendar__note">{limitNote}</span> : null}
      </div>
    </div> : null}
  </div>;
}
