import type { ButtonHTMLAttributes } from 'react';
export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
};
export function Button({variant='primary',size='md',className='',type='button',disabled,loading=false,children,...props}:ButtonProps){
  return <button {...props} type={type} disabled={disabled||loading} aria-busy={loading||undefined}
    className={['ui-button',`ui-button--${variant}`,`ui-button--${size}`,className].filter(Boolean).join(' ')}>
    {loading?<span className="ui-button__spinner" aria-hidden="true"/>:null}{children}
  </button>;
}
