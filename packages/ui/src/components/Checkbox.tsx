import { useId, type InputHTMLAttributes } from 'react';
import { FormMessage } from './FormMessage';
export type CheckboxProps=Omit<InputHTMLAttributes<HTMLInputElement>,'type'>&{label:string;hint?:string;error?:string};
export function Checkbox({id,label,hint,error,className='','aria-describedby':describedBy,...props}:CheckboxProps){
  const generated=useId(),controlId=id??generated,hintId=hint?`${controlId}-hint`:undefined,errorId=error?`${controlId}-error`:undefined;
  const description=[describedBy,hintId,errorId].filter(Boolean).join(' ')||undefined;
  return <div className={['ui-check-field',className].filter(Boolean).join(' ')}>
    <label htmlFor={controlId} className="ui-control-option">
      <input {...props} id={controlId} type="checkbox" aria-invalid={Boolean(error)} aria-describedby={description}/>
      <span>{label}</span>
    </label>
    {hint?<FormMessage id={hintId} tone="hint">{hint}</FormMessage>:null}
    {error?<FormMessage id={errorId} tone="error">{error}</FormMessage>:null}
  </div>;
}
