import { useEffect, useState } from 'react';
import type { ProjectState } from '../../domain/project-state/projectState';
import { projectStageLabel } from '../../domain/project-state/projectState';
import { supabaseProjectStateRepository } from '../../infrastructure/project-state/supabaseProjectStateRepository';

export function ProjectsWorkspace(){
 const[items,setItems]=useState<ProjectState[]>([]);const[loading,setLoading]=useState(true);const[error,setError]=useState<string|null>(null);
 useEffect(()=>{let active=true;supabaseProjectStateRepository.listProjects().then(v=>{if(active){setItems(v);setLoading(false)}}).catch(e=>{if(active){setError(e instanceof Error?e.message:'Unable to load authorized projects.');setLoading(false)}});return()=>{active=false}},[]);
 return <section className="panel"><h2>Authorized projects</h2><p>Project States move here when Project Authorization succeeds. Their identity and pre-authorization record are preserved.</p>{error?<p className="error-message">{error}</p>:null}{loading?<p>Loading…</p>:items.length?<div className="opportunity-list">{items.map(item=><article className="opportunity-card" key={item.id}><strong>{item.name}</strong><span>{projectStageLabel(item.stage)}</span><p>{item.summary||item.nextAction||'Authorized Ridgewood project.'}</p></article>)}</div>:<p>No authorized projects yet.</p>}</section>;
}