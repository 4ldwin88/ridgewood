import { ProjectSetup } from './ProjectSetup';
import { LifecycleProgress } from '../portfolio/LifecycleProgress';
import { ProjectPhoto } from '../portfolio/ProjectPhoto';
import { useEffect, useState } from 'react';
import type { ProjectState } from '../../domain/project-state/projectState';
import { projectStageLabel } from '../../domain/project-state/projectState';
import { supabaseProjectStateRepository } from '../../infrastructure/project-state/supabaseProjectStateRepository';
import { AuthorizedBasis } from './AuthorizedBasis';

export function ProjectsWorkspace(){
 const [search,setSearch]=useState('');
 const [selected,setSelected]=useState<ProjectState|null>(null);
 const [items,setItems]=useState<ProjectState[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null),[archived,setArchived]=useState(false),[archiving,setArchiving]=useState<string|null>(null);
 useEffect(()=>{let active=true;setLoading(true);setError(null);supabaseProjectStateRepository.listProjects(archived).then(v=>{if(active)setItems(v)}).catch(e=>{if(active)setError(e instanceof Error?e.message:'Unable to load projects.')}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[archived]);
 async function archive(item:ProjectState){
  if(!window.confirm(`Archive “${item.name}”? It will leave Active projects. Its identity, forms and authorization record will remain in Archived projects.`))return;
  setArchiving(item.id);setError(null);
  try{await supabaseProjectStateRepository.archiveProject(item.id);setItems(v=>v.filter(p=>p.id!==item.id))}
  catch(e){setError(e instanceof Error?e.message:'Project could not be archived.')}
  finally{setArchiving(null)}
 }
 const visible=items.filter(item=>`${item.name} ${item.location??''}`.toLowerCase().includes(search.toLowerCase()));
 if(selected)return <section className="panel"><button className="text-button" onClick={()=>setSelected(null)}>← Projects</button><div className="project-detail-heading"><ProjectPhoto project={selected} editable={!archived}/><div><h2>{selected.name}</h2><p>{selected.location||'Site not yet identified'}</p><p>{projectStageLabel(selected.stage)}</p></div></div><LifecycleProgress project={selected}/><AuthorizedBasis projectStateId={selected.id}/><ProjectSetup projectStateId={selected.id} onAdvanced={()=>{const advanced:ProjectState={...selected,stage:'preconstruction_mobilization',commercialStage:'preconstruction_mobilization'};setSelected(advanced);setItems(current=>current.map(item=>item.id===advanced.id?advanced:item))}}/></section>;
 return <section className="panel register-panel"><div className="register-toolbar"><div className="segmented-control" aria-label="Project list view"><button type="button" aria-pressed={!archived} disabled={Boolean(archiving)} onClick={()=>setArchived(false)}>Active projects</button><button type="button" aria-pressed={archived} disabled={Boolean(archiving)} onClick={()=>setArchived(true)}>Archived projects</button></div><label className="search-field"><span className="sr-only">Search projects</span><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search projects…"/></label></div><p className="register-intro">{archived?'Retained project history, published evidence and authorization decisions.':'Authorized projects and the decisions behind them.'}</p>{error?<p role="alert" className="error-message">{error}</p>:null}{loading?<p className="register-empty">Loading projects…</p>:<><div className="project-register" aria-label={archived?'Archived projects':'Authorized projects'}>{visible.map(item=><article className="project-register-card" key={item.id}><ProjectPhoto project={item} editable={!archived} menuActions={<>{!archived?<button type="button" disabled={Boolean(archiving)} onClick={()=>void archive(item)}>{archiving===item.id?'Archiving…':'Archive project'}</button>:<small>Archived · history retained</small>}<button onClick={()=>setSelected(item)}>Open project state</button></>}/><div className="project-register-card__info"><button className="record-link" onClick={()=>setSelected(item)}><strong>{item.name}</strong></button><small className="record-summary">{item.location||item.summary||'No location recorded'}</small>{archived?<span className="disposition">Archived</span>:null}</div><LifecycleProgress project={item}/></article>)}</div>{!visible.length?<div className="register-empty"><h3>{search?'No matching projects':archived?'No archived projects':'No authorized projects yet'}</h3><p>{search?'Try a different project name.':archived?'Archived projects remain available here.':'Complete the authorization review in Business to bring a project here.'}</p></div>:null}<div className="register-footer">{visible.length} project{visible.length===1?'':'s'}<span>Archiving retains published evidence and history.</span></div></>}</section>;
}
