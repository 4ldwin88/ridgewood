import { useEffect, useRef, useState } from 'react';
import { blankScopeItem, type ScopeItem } from '../../domain/project-state/scope';
import { scopeRepository, ScopeCommandError, type ScopeState, type ScopeSource } from '../../infrastructure/project-state/scopeRepository';
import { createRequestId } from '../../infrastructure/project-state/requestId';
import { WorkspaceModal } from '../business/WorkspaceModal';
import { useDrawerWorkState } from '../business/WorkspaceDrawer';
import { PublishedDocumentView } from '../business/PublishedDocumentView';

export function ScopeBasis({projectStateId,onSaved}:{projectStateId:string;onSaved:()=>void}){
 const [open,setOpen]=useState(false);
 return <div className="authorization-handoff"><button className="secondary-button" onClick={()=>setOpen(true)}>5.3 Scope, Exclusions &amp; Interfaces</button>{open&&<WorkspaceModal title="5.3 Scope, Exclusions & Interfaces" onClose={()=>setOpen(false)}><ScopeEditor projectStateId={projectStateId} onSaved={onSaved}/></WorkspaceModal>}</div>;
}
function SourceView({source}:{source:ScopeSource}){
 return <PublishedDocumentView revision={{documentId:source.documentId,revisionId:source.id,revisionNumber:source.revisionNumber,state:'published',title:source.label,documentType:source.documentType,category:source.category,packageKey:'',data:source.snapshot,snapshotAvailable:true,publishedAt:source.publishedAt,publishedBy:source.publishedBy,createdAt:'',changeNote:null,changes:[]}}/>;
}
function ScopeEditor({projectStateId,onSaved}:{projectStateId:string;onSaved:()=>void}){
 const [state,setState]=useState<ScopeState|null>(null),[items,setItems]=useState<ScopeItem[]>([]),[dirty,setDirty]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const pending=useRef<{kind:'save'|'request';id:string;version:number;items:ScopeItem[]}|null>(null);
 useDrawerWorkState(dirty||Boolean(pending.current),busy);
 useEffect(()=>{let active=true;scopeRepository.read(projectStateId).then(s=>{if(active){setState(s);setItems(s.items);}}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[projectStateId]);
 async function reload(){if((dirty||pending.current)&&!window.confirm('Discard unsaved scope entries and load the latest saved preparation?'))return;setBusy(true);try{const s=await scopeRepository.read(projectStateId);setState(s);setItems(s.items);pending.current=null;setDirty(false);setError('');setMessage('Latest saved scope loaded.');}catch{setError('Scope could not load. Try again.');}finally{setBusy(false);}}
 function change(id:string,patch:Partial<ScopeItem>){setItems(rows=>rows.map(row=>row.id===id?{...row,...patch}:row));setDirty(true);setMessage('');}
 async function command(kind:'save'|'request'){
  if(!state||busy)return;setBusy(true);setError('');setMessage('');
  try{const r=pending.current??{kind,id:createRequestId(),version:state.version,items:structuredClone(items)};pending.current=r;
   const s=r.kind==='save'?await scopeRepository.save(projectStateId,r.version,r.id,r.items):await scopeRepository.request(projectStateId,r.version,r.id);
   pending.current=null;setState(s);setItems(s.items);setDirty(false);onSaved();setMessage(r.kind==='save'?`Saved scope version ${s.savedVersion}. No baseline approved.`:`Review requested for scope version ${s.submittedVersion}. No changed work authorized.`);
  }catch(e){if(e instanceof ScopeCommandError&&e.code==='P0001')pending.current=null;
   const messages:Record<string,string>={scope_version_conflict:'Another scope version was saved. Reload before continuing.',invalid_scope_party:'A responsible party is unavailable or removed from new selections.',invalid_scope_source:'Select a published source revision belonging to this project.',incomplete_scope_review_basis:'Complete the saved scope requirements before requesting review.',scope_review_already_requested:'This version already has a review request. Reload its status.',missing_setup_edit_permission:'Your access does not permit scope preparation.',scope_edit_not_allowed:'The project no longer permits Setup edits.'};
   setError(`${messages[e instanceof Error?e.message:'']??'Scope could not be saved or submitted.'} ${pending.current?'Retry preserves the exact request.':'Your entries remain here.'}`);
  }finally{setBusy(false);}
 }
 if(!state)return <div>{error?<><p role="alert">{error}</p><button onClick={()=>void reload()} disabled={busy}>Retry loading scope</button></>:<p>Loading scope…</p>}</div>;
 const locked=!state.canEdit||busy||Boolean(pending.current),required=<span className="setup-required">Required for review</span>,optional=<span className="optional-label">Optional</span>;
 const picker=(item:ScopeItem,key:'sourceRevisionId'|'criterionRevisionId'|'programRevisionId',label:string)=> <label>{label} {key==='sourceRevisionId'?required:optional}<select value={item[key]} onChange={e=>change(item.id,{[key]:e.target.value})}><option value="">Select a published revision</option>{state.sources.filter(s=>key!=='programRevisionId'||s.category==='product_program').map(s=><option key={s.id} value={s.id}>{s.label}{s.state==='superseded'?' · Superseded':''}</option>)}</select><small>{key==='sourceRevisionId'?'Trace this component to its governing drawing, specification or scope document. A publication is not scope approval.':key==='criterionRevisionId'?'Reference the specification containing the acceptance criterion instead of copying it.':'Optional link to an existing Product & Program publication.'}</small></label>;
 return <section className="stage-tool-surface contract-review scope-basis">
 <h4>5.3.1 Scope basis and interfaces</h4><p>Describe controlled delivery components here. Other tools reference these scope items. Proposed assignments and exclusions do not change a contract or approved baseline.</p>
 <p>Frozen authorization: {state.authorizationRecordId??'Missing — recover authorization first'}. Approved scope baseline: not established in this module.</p>
 {!state.canEdit&&<p>This scope preparation is read-only for your access or the current project stage.</p>}
 {items.map((item,index)=><article className="setup-section" key={item.id}><h4>Scope component {index+1}</h4><fieldset disabled={locked}>
 <label>Scope description {required}<textarea maxLength={500} value={item.description} placeholder="Example: Supply and install lobby flooring" onChange={e=>change(item.id,{description:e.target.value})}/><small>One delivery component; retain upstream program requirements in their source.</small></label>
 <label>Classification {required}<select value={item.classification} onChange={e=>change(item.id,{classification:e.target.value as ScopeItem['classification']})}><option value="">Unassessed</option><option value="inclusion">Inclusion</option><option value="exclusion">Exclusion</option><option value="allowance">Allowance</option><option value="interface">Interface</option><option value="owner_supplied">Owner-supplied item</option></select></label>
 <label>Responsible party {item.classification&&item.classification!=='exclusion'?required:optional}<select value={item.partyId} onChange={e=>change(item.id,{partyId:e.target.value})}><option value="">Unassigned</option>{state.parties.map(p=><option key={p.id} value={p.id} disabled={p.retired&&p.id!==item.partyId}>{p.label}{p.retired?' · Removed from new selections':''}</option>)}</select><small>Required for included work, allowances, interfaces and owner-supplied items. This records a proposed boundary, not a subcontract award.</small></label>
 {picker(item,'sourceRevisionId','Governing source')}{picker(item,'criterionRevisionId','Acceptance specification')}
 <label>Acceptance criterion {item.criterionRevisionId?optional:required}<textarea maxLength={4000} value={item.acceptanceCriteria} placeholder="Example: Verify installation against the linked finish schedule and approved sample" onChange={e=>change(item.id,{acceptanceCriteria:e.target.value})}/><small>Required when no referenced specification supplies it. For an exclusion, explain how its boundary is verified.</small></label>
 {picker(item,'programRevisionId','Related program requirement')}
 <button onClick={()=>{if(window.confirm('Remove this component from the next preparation? Earlier saved versions remain available.')){setItems(rows=>rows.filter(r=>r.id!==item.id));setDirty(true);}}}>Remove from preparation</button>
 </fieldset>{state.sources.find(s=>s.id===item.sourceRevisionId)&&<details><summary>View governing source · exact revision</summary><SourceView source={state.sources.find(s=>s.id===item.sourceRevisionId)!}/></details>}</article>)}
 <button disabled={locked||items.length>=100} onClick={()=>{setItems(rows=>[...rows,blankScopeItem(createRequestId())]);setDirty(true);}}>Add scope component</button>

 {error&&<p role="alert">{error}</p>}<p role="status" aria-label="Scope save status">{message||`Saved scope version ${state.version}`}{dirty?' · Unsaved changes':''}</p>
 <h4>5.3.2 Request scope review</h4><p>Submit the exact saved version for authorized review. This creates a request and audit record; it sends no notification and grants no scope, spending or Gate authority.</p>
 {state.blockers.length>0&&<div><strong>Saved preparation needs:</strong><ul>{state.blockers.map(b=><li key={b}>{b}</li>)}</ul></div>}
 <button disabled={!state.canEdit||busy||dirty||state.version===0||pending.current?.kind==='save'||(!pending.current&&state.requests.some(r=>r.version===state.version))} onClick={()=>void command('request')}>{pending.current?.kind==='request'?'Retry scope review request':'Request scope review'}</button>
 <ul aria-label="Scope review requests">{state.requests.map(r=><li key={r.id}>Version {r.version} · {r.status==='pending'?'Pending authorized baseline review':'Superseded by newer preparation'}</li>)}</ul>
 <h4>Scope preparation history</h4>{state.history.map(h=><details className="setup-section" key={h.version}><summary>Version {h.version} · {new Date(h.createdAt).toLocaleString()} · {h.items.length} components</summary><ul>{h.items.map(i=><li key={i.id}>{i.classification||'Unassessed'} · {i.description||'Description not supplied'}<dl><dt>Responsible party reference</dt><dd>{i.partyId||'Unassigned'}</dd><dt>Governing source revision</dt><dd>{i.sourceRevisionId||'Not supplied'}</dd><dt>Acceptance specification revision</dt><dd>{i.criterionRevisionId||'Not supplied'}</dd><dt>Acceptance criterion</dt><dd>{i.acceptanceCriteria||'Not supplied; consult the referenced specification'}</dd><dt>Related program revision</dt><dd>{i.programRevisionId||'Not supplied'}</dd></dl></li>)}</ul></details>)}
 <div className="setup-actions scope-actions"><button disabled={!state.canEdit||busy||pending.current?.kind==='request'} onClick={()=>void command('save')}>{pending.current?.kind==='save'?'Retry scope save':'Save scope preparation'}</button><button disabled={busy} onClick={()=>void reload()}>Reload saved scope</button></div>
 </section>;
}
