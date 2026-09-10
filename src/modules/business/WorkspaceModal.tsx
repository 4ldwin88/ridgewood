import { type ReactNode, useEffect } from 'react';
import { WorkspaceDrawer } from './WorkspaceDrawer';

type Props = {title:string;onClose:()=>void;children:ReactNode;busy?:boolean;confirmation?:boolean};

/** Ordinary work uses a drawer. Consequential confirmations remain compact. */
export function WorkspaceModal({title,onClose,children,busy=false,confirmation=false}:Props){
 if(confirmation)return <ConfirmationModal title={title} onClose={onClose} busy={busy}>{children}</ConfirmationModal>;
 return <WorkspaceDrawer title={title} contextKey={title} onClose={onClose} busy={busy} closeLabel={`Close ${title}`}>{children}</WorkspaceDrawer>;
}
function ConfirmationModal({title,onClose,children,busy=false}:Props){
 useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!busy)onClose()};document.addEventListener('keydown',onKey);const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.removeEventListener('keydown',onKey);document.body.style.overflow=previous}},[onClose,busy]);
 return <div className="workspace-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose()}}><section className="workspace-modal workspace-modal--confirmation" role="dialog" aria-modal="true" aria-label={title} aria-busy={busy}><header className="workspace-modal__header"><h3>{title}</h3><button type="button" onClick={onClose} disabled={busy} aria-label={`Close ${title}`}>Close</button></header><div className="workspace-modal__body">{children}</div></section></div>;
}
