import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from './Button';
import { X } from 'lucide-react';
import { Icon } from './Icon';
export type DialogProps={open:boolean;onClose:()=>void;title:string;description?:string;children:ReactNode;footer?:ReactNode};
export function Dialog({open,onClose,title,description,children,footer}:DialogProps){
  const ref=useRef<HTMLDialogElement>(null),titleId=useId(),descriptionId=useId();
  useEffect(()=>{const dialog=ref.current;if(!dialog)return;
    if(open&&!dialog.open)dialog.showModal();
    else if(!open&&dialog.open)dialog.close();
  },[open]);
  return <dialog ref={ref} className="ui-dialog" aria-labelledby={titleId}
    aria-describedby={description?descriptionId:undefined}
    onClose={()=>{if(open)onClose()}}>
    <div className="ui-dialog__header"><div><h2 className="ui-dialog__title" id={titleId}>{title}</h2>
      {description?<p className="ui-dialog__description" id={descriptionId}>{description}</p>:null}</div>
      <Button variant="ghost" size="sm" onClick={onClose} aria-label="Fechar janela"><Icon icon={X} size="sm" /></Button></div>
    <div className="ui-dialog__body">{children}</div>
    {footer?<div className="ui-dialog__footer">{footer}</div>:null}
  </dialog>;
}
