import { useId, type ReactNode } from 'react';
import { FormMessage } from './FormMessage';
export type FieldProps={label:string;htmlFor:string;hint?:string;error?:string;required?:boolean;children:ReactNode;className?:string};
export function Field({label,htmlFor,hint,error,required,children,className=''}:FieldProps){
  return <div className={['ui-field',className].filter(Boolean).join(' ')}>
    <label htmlFor={htmlFor} className="ui-field__label">{label}{required?<span aria-hidden="true"> *</span>:null}</label>
    {children}{hint?<FormMessage tone="hint">{hint}</FormMessage>:null}
    {error?<FormMessage tone="error">{error}</FormMessage>:null}
  </div>;
}
export function useFieldIds(id?:string,hint?:string,error?:string,describedBy?:string){
  const generated=useId();const controlId=id??generated;
  const hintId=hint?`${controlId}-hint`:undefined,errorId=error?`${controlId}-error`:undefined;
  return {controlId,hintId,errorId,description:[describedBy,hintId,errorId].filter(Boolean).join(' ')||undefined};
}
