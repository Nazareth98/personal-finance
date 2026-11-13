import { createContext,useCallback,useContext,useEffect,useRef,useState,type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Icon } from './Icon';
export type ToastTone='info'|'success'|'error';
export type ToastOptions={message:string;tone?:ToastTone;durationMs?:number};
type ToastItem=Required<ToastOptions>&{id:number};
type ToastApi={notify:(options:ToastOptions)=>number;dismiss:(id:number)=>void};
const Context=createContext<ToastApi|null>(null);
export function ToastProvider({children}:{children:ReactNode}){
  const nextId=useRef(0),timers=useRef(new Map<number,ReturnType<typeof setTimeout>>());
  const [items,setItems]=useState<ToastItem[]>([]);
  const dismiss=useCallback((id:number)=>{const timer=timers.current.get(id);if(timer)clearTimeout(timer);
    timers.current.delete(id);setItems(current=>current.filter(item=>item.id!==id));},[]);
  const notify=useCallback(({message,tone='info',durationMs=5000}:ToastOptions)=>{
    const id=++nextId.current;
    setItems(current=>[...current,{id,message,tone,durationMs}]);
    if(durationMs>0)timers.current.set(id,setTimeout(()=>dismiss(id),durationMs));
    return id;
  },[dismiss]);
  useEffect(()=>{const active=timers.current;return ()=>{for(const t of active.values())clearTimeout(t);active.clear()}},[]);
  return <Context.Provider value={{notify,dismiss}}>{children}
    <div className="ui-toast-viewport" role="region" aria-label="Notificações">{items.map(item=>
      <div className={`ui-toast ui-toast--${item.tone}`} key={item.id}
        role={item.tone==='error'?'alert':'status'}>
        <span>{item.message}</span>
        <button type="button" className="ui-toast__close" onClick={()=>dismiss(item.id)} aria-label="Dispensar notificação"><Icon icon={X} size="sm" /></button>
      </div>)}</div>
  </Context.Provider>;
}
export function useToast(){const value=useContext(Context);if(!value)throw new Error('useToast requer ToastProvider');return value}
