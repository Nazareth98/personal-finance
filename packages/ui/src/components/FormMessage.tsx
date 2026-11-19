import type { HTMLAttributes } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Icon } from './Icon';
export type FormMessageProps = HTMLAttributes<HTMLParagraphElement> & { tone?: 'hint'|'error'|'success' };
/** Erros levam ícone além da cor (D-042), para não depender só do vermelho. */
export function FormMessage({tone='hint',className='',children,...props}:FormMessageProps){
  return <p {...props} role={tone==='error'?'alert':props.role}
    className={['ui-form-message',`ui-form-message--${tone}`,className].filter(Boolean).join(' ')}>
    {tone==='error'&&<Icon icon={TriangleAlert} size="sm" className="ui-form-message__icon"/>}{children}
  </p>;
}
