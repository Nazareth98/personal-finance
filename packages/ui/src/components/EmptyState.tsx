import type {ReactNode} from 'react';
export type EmptyStateProps={title:string;description?:string;action?:ReactNode;icon?:ReactNode};
export function EmptyState({title,description,action,icon}:EmptyStateProps){return <div className="ui-empty-state" role="status">{icon?<span className="ui-empty-state__icon" aria-hidden="true">{icon}</span>:null}<strong>{title}</strong>{description?<p>{description}</p>:null}{action}</div>;}
