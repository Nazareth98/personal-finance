import { useId, type CSSProperties, type InputHTMLAttributes, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Icon } from './Icon';
import { RequiredMark } from './Field';
import { FormMessage } from './FormMessage';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
  /** Ícone decorativo dentro do campo, à esquerda. */
  leadingIcon?: LucideIcon;
  /** Unidade fixa antes do valor (ex.: “R$”). Entra na descrição acessível do campo. */
  startText?: string;
  /** Unidade fixa depois do valor (ex.: “%”). Entra na descrição acessível do campo. */
  endText?: string;
  /** Controle dentro do campo, à direita (ex.: mostrar senha). Precisa de nome acessível próprio. */
  trailing?: ReactNode;
};

export function Input({ id, label, hint, error, className = '', leadingIcon, startText, endText, trailing, required, 'aria-describedby': describedBy, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const unitId = startText || endText ? `${inputId}-unit` : undefined;
  const description = [unitId, describedBy, hintId, errorId].filter(Boolean).join(' ') || undefined;
  const wrapped = Boolean(leadingIcon || trailing || startText || endText);
  const input = <input {...props} id={inputId} required={required} aria-invalid={Boolean(error)} aria-describedby={description}
    className={['ui-input', endText ? 'ui-input--end-text' : '', className].filter(Boolean).join(' ')} />;
  const style = { '--ui-affix-start': startText ? `${startText.length + 1}ch` : undefined, '--ui-affix-end': endText ? `${endText.length + 1}ch` : undefined } as CSSProperties;

  return (
    <div className="ui-field">
      <div className="ui-field__label-row"><label htmlFor={inputId} className="ui-field__label">{label}</label>{required ? <RequiredMark /> : null}</div>
      {wrapped
        ? <div style={style} className={['ui-input-wrap', leadingIcon ? 'ui-input-wrap--leading' : '', startText ? 'ui-input-wrap--start-text' : '', endText ? 'ui-input-wrap--end-text' : '', trailing ? 'ui-input-wrap--trailing' : ''].filter(Boolean).join(' ')}>
          {leadingIcon && <Icon icon={leadingIcon} size="sm" className="ui-input-wrap__icon" />}
          {startText && <span className="ui-input-wrap__affix ui-input-wrap__affix--start" aria-hidden="true">{startText}</span>}
          {input}
          {endText && <span className="ui-input-wrap__affix ui-input-wrap__affix--end" aria-hidden="true">{endText}</span>}
          {unitId && <span id={unitId} hidden>{`Em ${startText ?? endText}`}</span>}
          {trailing && <span className="ui-input-wrap__trailing">{trailing}</span>}
        </div>
        : input}
      {hint && <p id={hintId} className="ui-field__hint">{hint}</p>}
      {error && <FormMessage id={errorId} tone="error" className="ui-field__error">{error}</FormMessage>}
    </div>
  );
}
