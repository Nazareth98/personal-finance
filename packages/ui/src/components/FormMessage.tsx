import type { HTMLAttributes } from 'react';
export type FormMessageProps = HTMLAttributes<HTMLParagraphElement> & { tone?: 'hint'|'error'|'success' };
export function FormMessage({tone='hint',className='',...props}:FormMessageProps){
  return <p {...props} role={tone==='error'?'alert':props.role}
    className={['ui-form-message',`ui-form-message--${tone}`,className].filter(Boolean).join(' ')}/>;
}
