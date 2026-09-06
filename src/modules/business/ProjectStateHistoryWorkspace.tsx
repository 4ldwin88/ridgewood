import { useEffect, useState } from 'react';
import { projectStageLabel } from '../../domain/project-state/projectState';
import { supabaseProjectStateRepository, type DispositionEvent, type ProjectStateStageRequirement } from '../../infrastructure/project-state/supabaseProjectStateRepository';

const eventLabel=(value:string)=>value.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
const statusLabel=(value?:string)=>value?value.replaceAll('_',' '):'—';
const formatTime=(value:string)=>new Date(value).toLocaleString();
const errorText=(e:unknown)=>e instanceof Error?e.message:'History could not load.';

export function ProjectStateHistoryWorkspace({projectStateId}:{projectStateId:string}){
 const[events,setEvents]=useState<DispositionEvent[]>([]),[reassessment,setReassessment]=useState<ProjectStateStageRequirement[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null);
 useEffect(()=>{let active=true;setLoading(true);setError(null);Promise.all([supabaseProjectStateRepository.dispositionHistory(projectStateId),supabaseProjectStateRepository.reassessmentRequirements(projectStateId)]).then(([history,requirements])=>{if(active){setEvents(history);setReassessment(requirements)}}).catch(e=>{if(active)setError(errorText(e))}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[projectStateId]);
 if(loading)return <details className="panel"><summary>Disposition & reassessment history</summary><p>Loading…</p></details>;
 return <details className="panel"><summary>Disposition & reassessment history</summary>{error?<p className="error-message">{error}</p>:null}{reassessment.length?<section><h3>Reassessment</h3><div className="guided-checklist">{reassessment.map(r=><article key={`${r.stage}-${r.requirementKey}`}><strong>{r.label}</strong><span>{statusLabel(r.status)}{r.stage?` · ${projectStageLabel(r.stage)}`:''}</span>{r.notes?<p>{r.notes}</p>:null}</article>)}</div></section>:null}<section><h3>Disposition history</h3>{events.length?<div className="guided-checklist">{events.map(event=><article key={event.id}><strong>{eventLabel(event.eventType)}</strong><span>{formatTime(event.createdAt)}</span><p>{statusLabel(event.priorStatus)} → {statusLabel(event.newStatus)} · {projectStageLabel(event.priorStage as Parameters<typeof projectStageLabel>[0])}</p>{event.reason?<p>Reason: {event.reason}</p>:null}{event.basis?<p>Basis: {event.basis}</p>:null}<small>Actor {event.actorUserId}</small></article>)}</div>:<p>No material disposition events recorded.</p>}</section></details>;
}
