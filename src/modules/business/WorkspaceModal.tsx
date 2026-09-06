import { type ReactNode, useEffect } from 'react';

export function WorkspaceModal({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){
 useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()};document.addEventListener('keydown',onKey);const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.removeEventListener('keydown',onKey);document.body.style.overflow=previous}},[onClose]);
 return <div className="workspace-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="workspace-modal" role="dialog" aria-modal="true" aria-label={title}><header className="workspace-modal__header"><div><p className="eyebrow">Business workspace</p><h3>{title}</h3></div><button type="button" className="workspace-modal__close" onClick={onClose} aria-label={`Close ${title}`}>×</button></header><div className="workspace-modal__body">{children}</div></section></div>;
}
