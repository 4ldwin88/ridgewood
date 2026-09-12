import { type ReactNode, useEffect, useRef, useState } from 'react';
import type { ProjectState } from '../../domain/project-state/projectState';
import { supabase } from '../../infrastructure/auth/supabaseClient';

const bucket='ridgewood-project-photos';
export function ProjectPhoto({project,editable=false,menuActions}:{project:ProjectState;editable?:boolean;menuActions?:ReactNode}) {
  const [url,setUrl]=useState<string>(),[busy,setBusy]=useState(false),[error,setError]=useState<string>();
  const [revision,setRevision]=useState(0);
  const menuRef=useRef<HTMLDetailsElement>(null);
  useEffect(()=>{
    function outside(event:PointerEvent){
      const menu=menuRef.current;
      if(menu?.open && event.target instanceof Node && !menu.contains(event.target))menu.open=false;
    }
    function escape(event:KeyboardEvent){
      const menu=menuRef.current;
      if(event.key==='Escape' && menu?.open){
        menu.open=false;
        menu.querySelector('summary')?.focus();
      }
    }
    document.addEventListener('pointerdown',outside,true);
    document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',escape);};
  },[]);
  useEffect(()=>{let active=true;let objectUrl:string|undefined;
    async function load(){
      const listing=await supabase.storage.from(bucket).list(project.id,{search:'cover',limit:10});
      if(!active)return;
      if(listing.error)throw listing.error;
      if(!listing.data?.some(file=>file.name==='cover')){setUrl(undefined);return;}
      const {data,error}=await supabase.storage.from(bucket).download(`${project.id}/cover`);
      if(!active)return;
      if(error)throw error;
      if(data){objectUrl=URL.createObjectURL(data);setUrl(objectUrl);setError(undefined);}
    }
    void load().catch(()=>{if(active)setError('Photo could not load.');});
    return()=>{active=false;if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[project.id,revision]);
  async function upload(file?:File){if(!file)return;setError(undefined);
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setError('Choose a JPG, PNG or WebP image.');return;}
    if(file.size>5*1024*1024){setError('Choose an image smaller than 5 MB.');return;}
    setBusy(true);
    try{const{error}=await supabase.storage.from(bucket).upload(`${project.id}/cover`,file,{upsert:true,contentType:file.type,cacheControl:'60'});if(error)throw error;setRevision(v=>v+1);}
    catch(e){setError(e instanceof Error?e.message:'Photo upload failed. Please try again.');}finally{setBusy(false);}
  }
  return <div className={`project-photo${editable?' is-editable':''}`}>
    {url?<img src={url} alt={`${project.name} project photo`}/>:<div className="photo-placeholder" aria-label="No project photo"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M4 21V4h10v17M14 10h6v11M2 21h20M7 7h4M7 11h4M7 15h4"/></svg></div>}
    {menuActions ? <details ref={menuRef} className="row-menu photo-menu"><summary aria-label={`Manage ${project.name}`}><span aria-hidden="true">⋮</span></summary><div className="row-menu__items" onClick={event=>{if(event.target instanceof Element && event.target.closest('button') && menuRef.current)menuRef.current.open=false;}}>{editable?<label className="photo-upload">{busy?'Uploading…':url?'Change photo':'Add photo'}<input aria-label={`Upload photo for ${project.name}`} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>{void upload(e.target.files?.[0]);e.target.value='';}}/></label>:null}{menuActions}</div></details> : editable?<label className="photo-upload">{busy?'Uploading…':url?'Change photo':'Add photo'}<input aria-label={`Upload photo for ${project.name}`} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>{void upload(e.target.files?.[0]);e.target.value='';}}/></label>:null}
    {error?<small role="alert">{error}</small>:null}
  </div>;
}
