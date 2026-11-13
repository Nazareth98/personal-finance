import { useId, type FieldsetHTMLAttributes } from 'react';
import { FormMessage } from './FormMessage';
export type RadioOption={value:string;label:string;disabled?:boolean};
export type RadioGroupProps=Omit<FieldsetHTMLAttributes<HTMLFieldSetElement>,'onChange'>&{
  legend:string;name:string;options:readonly RadioOption[];value?:string;defaultValue?:string;required?:boolean;
  onChange?:(value:string)=>void;hint?:string;error?:string;
};
export function RadioGroup({legend,name,options,value,defaultValue,onChange,hint,error,required,className='',...props}:RadioGroupProps){
  const generated=useId(),hintId=hint?`${generated}-hint`:undefined,errorId=error?`${generated}-error`:undefined;
  return <fieldset {...props} className={['ui-radio-group',className].filter(Boolean).join(' ')}
    aria-invalid={Boolean(error)} aria-describedby={[hintId,errorId].filter(Boolean).join(' ')||undefined}>
    <legend className="ui-field__label">{legend}{required?<span aria-hidden="true"> *</span>:null}</legend>
    <div className="ui-radio-options">{options.map(o=><label key={o.value} className="ui-control-option">
      <input type="radio" name={name} value={o.value}
        checked={value===undefined?undefined:value===o.value}
        defaultChecked={value===undefined?defaultValue===o.value:undefined}
        onChange={e=>{if(e.target.checked)onChange?.(o.value)}}
        disabled={props.disabled||o.disabled} required={required}/>
      <span>{o.label}</span>
    </label>)}</div>
    {hint?<FormMessage id={hintId} tone="hint">{hint}</FormMessage>:null}
    {error?<FormMessage id={errorId} tone="error">{error}</FormMessage>:null}
  </fieldset>;
}
