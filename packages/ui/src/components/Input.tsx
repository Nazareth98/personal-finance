import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Icon } from './Icon';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
  /** Ícone decorativo dentro do campo, à esquerda. */
  leadingIcon?: LucideIcon;
  /** Controle dentro do campo, à direita (ex.: mostrar senha). Precisa de nome acessível próprio. */
  trailing?: ReactNode;
};

export function Input({ id, label, hint, error, className = '', leadingIcon, trailing, 'aria-describedby': describedBy, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const description = [describedBy, hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="ui-field">
      <label htmlFor={inputId} className="ui-field__label">{label}</label>
      {leadingIcon || trailing
        ? <div className={['ui-input-wrap', leadingIcon ? 'ui-input-wrap--leading' : '', trailing ? 'ui-input-wrap--trailing' : ''].filter(Boolean).join(' ')}>
          {leadingIcon && <Icon icon={leadingIcon} size="sm" className="ui-input-wrap__icon" />}
          <input {...props} id={inputId} aria-invalid={Boolean(error)} aria-describedby={description} className={['ui-input', className].filter(Boolean).join(' ')} />
          {trailing && <span className="ui-input-wrap__trailing">{trailing}</span>}
        </div>
        : <input
          {...props}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={description}
          className={['ui-input', className].filter(Boolean).join(' ')}
        />}
      {hint && <p id={hintId} className="ui-field__hint">{hint}</p>}
      {error && <p id={errorId} className="ui-field__error" role="alert">{error}</p>}
    </div>
  );
}
