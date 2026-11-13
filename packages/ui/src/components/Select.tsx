import type { SelectHTMLAttributes } from 'react';
import { useFieldIds } from './Field';
import { FormMessage } from './FormMessage';
export type SelectOption={value:string;label:string;disabled?:boolean};
export type SelectProps=Omit<SelectHTMLAttributes<HTMLSelectElement>,'children'>&{
  label:string;options:readonly SelectOption[];placeholder?:string;hint?:string;error?:string;
};
export function Select({id,label,options,placeholder,hint,error,required,className='','aria-describedby':describedBy,...props}:SelectProps){
  const {controlId,hintId,errorId,description}=useFieldIds(id,hint,error,describedBy);
  return <div className="ui-field">
    <label htmlFor={controlId} className="ui-field__label">{label}{required?<span aria-hidden="true"> *</span>:null}</label>
    <select {...props} id={controlId} required={required} aria-invalid={Boolean(error)} aria-describedby={description}
      className={['ui-input','ui-select',className].filter(Boolean).join(' ')}>
      {placeholder?<option value="" disabled>{placeholder}</option>:null}
      {options.map(o=><option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}
    </select>
    {hint?<FormMessage tone="hint" id={hintId}>{hint}</FormMessage>:null}
    {error?<FormMessage tone="error" id={errorId}>{error}</FormMessage>:null}
  </div>;
}
