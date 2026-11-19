import { useId, type ReactNode } from 'react';
import { FormMessage } from './FormMessage';
/** Marca visual de obrigatoriedade: só o asterisco (D-043). O leitor de tela já anuncia pelo atributo `required`. */
export function RequiredMark(){return <span className="ui-field__required" aria-hidden="true">*</span>;}
export type FieldProps={label:string;htmlFor:string;hint?:string;error?:string;required?:boolean;children:ReactNode;className?:string};
export function Field({label,htmlFor,hint,error,required,children,className=''}:FieldProps){
  return <div className={['ui-field',className].filter(Boolean).join(' ')}>
    <div className="ui-field__label-row"><label htmlFor={htmlFor} className="ui-field__label">{label}</label>{required ? <RequiredMark /> : null}</div>
    {children}{hint?<FormMessage tone="hint">{hint}</FormMessage>:null}
    {error?<FormMessage tone="error">{error}</FormMessage>:null}
  </div>;
}
export function useFieldIds(id?:string,hint?:string,error?:string,describedBy?:string){
  const generated=useId();const controlId=id??generated;
  const hintId=hint?`${controlId}-hint`:undefined,errorId=error?`${controlId}-error`:undefined;
  return {controlId,hintId,errorId,description:[describedBy,hintId,errorId].filter(Boolean).join(' ')||undefined};
}
