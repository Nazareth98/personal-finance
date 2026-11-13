import type {ReactNode} from 'react';
import {Button} from './Button';

export type ErrorStateProps={
  title?:string;
  description?:string;
  onRetry?:()=>void;
  retryLabel?:string;
  icon?:ReactNode;
};
export function ErrorState({
  title='Não foi possível carregar os dados',
  description='Ocorreu um erro. Tente novamente.',
  onRetry,retryLabel='Tentar novamente',icon,
}:ErrorStateProps){
  return <div className="ui-error-state" role="alert">
    {icon?<span className="ui-error-state__icon" aria-hidden="true">{icon}</span>:null}
    <strong>{title}</strong>
    <p>{description}</p>
    {onRetry?<Button variant="secondary" onClick={onRetry}>{retryLabel}</Button>:null}
  </div>;
}
