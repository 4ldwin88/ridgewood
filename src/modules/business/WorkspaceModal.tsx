import { type ReactNode, useEffect, useRef } from 'react';
import { WorkspaceDrawer } from './WorkspaceDrawer';

type Props = {title:string;onClose:()=>void;children:ReactNode;busy?:boolean;confirmation?:boolean};

/** Ordinary work uses a drawer. Consequential confirmations remain compact. */
export function WorkspaceModal({title,onClose,children,busy=false,confirmation=false}:Props){
 if(confirmation)return <ConfirmationModal title={title} onClose={onClose} busy={busy}>{children}</ConfirmationModal>;
 return <WorkspaceDrawer title={title} contextKey={title} onClose={onClose} busy={busy} closeLabel={`Close ${title}`}>{children}</WorkspaceDrawer>;
}
function ConfirmationModal({title,onClose,children,busy=false}:Props){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const el=dialog.current!;const trigger=document.activeElement as HTMLElement|null;const previous=document.body.style.overflow;document.body.style.overflow='hidden';el.showModal();return()=>{el.close();document.body.style.overflow=previous;trigger?.focus()}},[]);
 return <dialog ref={dialog} className="workspace-modal workspace-modal--confirmation" aria-label={title} aria-busy={busy} onCancel={e=>{e.preventDefault();if(!busy)onClose()}}><header className="workspace-modal__header"><h3>{title}</h3><button type="button" onClick={onClose} disabled={busy} aria-label={`Close ${title}`}>Close</button></header><div className="workspace-modal__body">{children}</div>{import.meta.env.VITE_DEV_FEEDBACK_ENABLED!=='false'?<button type="button" className="dev-notes-trigger dev-notes-floating" aria-label="Open development notes" onClick={()=>window.dispatchEvent(new CustomEvent('ridgewood:dev-note',{detail:title}))}>+</button>:null}</dialog>;
}
