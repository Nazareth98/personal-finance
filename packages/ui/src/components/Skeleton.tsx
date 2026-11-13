import type {HTMLAttributes} from 'react';
export type SkeletonProps=HTMLAttributes<HTMLSpanElement>&{width?:string;height?:string};
export function Skeleton({width='100%',height='16px',className='',style,...props}:SkeletonProps){return <span {...props} aria-hidden="true" className={['ui-skeleton',className].filter(Boolean).join(' ')} style={{...style,width,height}}/>;}
