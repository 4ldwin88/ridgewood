import { useEffect, useRef, useState } from 'react';
import { blankContract, contractRepository, type ContractData, type ContractState, type ContractOption } from '../../infrastructure/project-state/contractRepository';
import { createRequestId } from '../../infrastructure/project-state/requestId';
import { WorkspaceModal } from '../business/WorkspaceModal';
import { useDrawerWorkState } from '../business/WorkspaceDrawer';

export function ContractReview({projectStateId,onSaved}:{projectStateId:string;onSaved?:()=>void}) {
 const [open,setOpen]=useState(false);
 return <div className="authorization-handoff"><button className="secondary-button" onClick={()=>setOpen(true)}>5.2 Contract &amp; Commercial Review</button>{open&&<WorkspaceModal title="5.2 Contract & Commercial Review" onClose={()=>setOpen(false)}><ContractEditor key={projectStateId} projectStateId={projectStateId} onSaved={onSaved}/></WorkspaceModal>}</div>;
}
function ContractEditor({projectStateId,onSaved}:{projectStateId:string;onSaved?:()=>void}) {
 const [state,setState]=useState<ContractState|null>(null),[data,setData]=useState<ContractData>(blankContract),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[dirty,setDirty]=useState(false);
 const pending=useRef<{id:string;version:number;data:ContractData}|null>(null);
 useDrawerWorkState(dirty,busy);
 useEffect(()=>{let active=true;contractRepository.read(projectStateId).then(s=>{if(active){setState(s);setData(s.data??blankContract());}}).catch(e=>{if(active)setError(e instanceof Error?e.message:'Contract preparation could not load.');});return()=>{active=false;};},[projectStateId]);
 const change=(patch:Partial<ContractData>)=>{setData(v=>({...v,...patch}));setDirty(true);setMessage('');};
 async function reload(){
  if((dirty||pending.current)&&!window.confirm('Replace these entries with the latest saved contract preparation?'))return;
  setBusy(true);setError('');
  try{const s=await contractRepository.read(projectStateId);setState(s);setData(s.data??blankContract());pending.current=null;setDirty(false);setMessage('Latest saved contract preparation loaded.');}
  catch(e){setError(e instanceof Error?e.message:'Reload failed.');}finally{setBusy(false);}
 }
 async function save(){
  if(!state)return;setBusy(true);setError('');
  try{const request=pending.current??{id:createRequestId(),version:state.version,data:structuredClone(data)};pending.current=request;const s=await contractRepository.save(projectStateId,request.version,request.id,request.data);setState(s);setData(s.data??blankContract());pending.current=null;setDirty(false);onSaved?.();setMessage(`Saved preparation version ${s.savedVersion??s.version}. No approval granted.`);}
  catch(e){setError(`${e instanceof Error?e.message:'Save response unavailable.'} Your entries remain here. Retry preserves the same request; reload to resolve a version conflict.`);}finally{setBusy(false);}
 }
 if(!state)return <div>{error?<><p role="alert">{error}</p><button disabled={busy} onClick={()=>void reload()}>Retry loading contract</button></>:<p role="status">Loading contract preparation…</p>}</div>;
 const locked=!state.canEdit||busy||Boolean(pending.current);
 const required=<span className="setup-required">Required for review</span>;
 const optional=<span className="optional-label">Optional</span>;
 const select=(label:string,key:'agreementRevisionId'|'agreementEvidenceId'|'reviewDecisionId',options:ContractOption[],hint:string)=><label>{label} {key==='agreementEvidenceId'?optional:required}<select value={data[key]} onChange={e=>change({[key]:e.target.value})}><option value="">Select an existing record</option>{options.map(o=><option value={o.id} key={o.id}>{o.label}</option>)}</select><small>{hint}</small></label>;
 const checklist=(key:'partyIds'|'riskIds',options:ContractOption[])=><div className="contract-choices">{options.length?options.map(o=><label key={o.id}><input type="checkbox" checked={data[key].includes(o.id)} disabled={locked||(o.retired&&!data[key].includes(o.id))} onChange={e=>change({[key]:e.target.checked?[...data[key],o.id]:data[key].filter(id=>id!==o.id)})}/>{o.label}{o.retired?' · Removed from new selections':''}</label>):<p>No linked records available yet.</p>}</div>;
 return <section className="stage-tool-surface contract-review">
 <h4>5.2.1 Contract preparation</h4><p>Prepare the contractual basis once. Agreement and risk references use existing project records; legal parties use the organization register.</p>
 <p role="status">{message||`Saved preparation version ${state.version}`}{dirty?' · Unsaved changes':''}</p>
 <p>Preparation only. An attached decision is a reference, not verified signing or review authority. This tool cannot grant contract approval or satisfy Gate 01.</p>
 {error&&<p role="alert">{error}</p>}{!state.canEdit&&<p>This contract preparation is read-only for your access or the current project state.</p>}
 <fieldset disabled={locked}>
 <h4>Legal parties {required}</h4><p>Select the legal entities that are parties to the agreement. Add missing organizations through Network before selecting them here.</p>{checklist('partyIds',state.parties)}
 {select('Agreement publication','agreementRevisionId',state.agreements,'Select the exact published agreement revision. A current draft is not an executed or reviewed agreement.')}
 {select('Supporting agreement evidence','agreementEvidenceId',state.evidence,'Reference supporting signature or review evidence already attached to this project.')}
 <label>Compensation model {required}<select value={data.compensationModel} onChange={e=>change({compensationModel:e.target.value as ContractData['compensationModel']})}><option value="">Assess compensation model</option><option value="fixed">Stated contract value</option><option value="fee">Fee / rate basis</option><option value="mixed">Value plus fee / rate basis</option></select></label>
 {(data.compensationModel==='fixed'||data.compensationModel==='mixed')&&<div><label>Contract value {required}<input inputMode="decimal" value={data.contractValue} placeholder="Example: 250000.00" onChange={e=>change({contractValue:e.target.value})}/><small>Amount stated in the agreement; exclude assumptions about revenue recognition.</small></label><label>Currency {required}<input maxLength={3} value={data.currency} placeholder="Example: CAD" onChange={e=>change({currency:e.target.value.toUpperCase()})}/></label></div>}
 {(data.compensationModel==='fee'||data.compensationModel==='mixed')&&<label>Fee basis {required}<textarea maxLength={4000} value={data.feeBasis} placeholder="Example: Monthly fixed management fee plus approved reimbursables" onChange={e=>change({feeBasis:e.target.value})}/></label>}
 <label>Payment terms {required}<textarea maxLength={4000} value={data.paymentTerms} placeholder="Example: Monthly application; payment due under executed agreement clause 8" onChange={e=>change({paymentTerms:e.target.value})}/><small>Include timing, retainage and payment conditions needed for commercial control.</small></label>
 <label>Effective from <span className="setup-required">Required where defined</span><input type="date" value={data.effectiveFrom} onChange={e=>change({effectiveFrom:e.target.value})}/><small>Enter the effective date where the agreement defines one.</small></label>
 <label>Effective until <span className="setup-required">Required where defined</span><input type="date" value={data.effectiveUntil} onChange={e=>change({effectiveUntil:e.target.value})}/><small>Enter expiry where it governs the agreement.</small></label>
 <label>Contractual risk assessment {required}<select value={data.riskAssessment} onChange={e=>change({riskAssessment:e.target.value as ContractData['riskAssessment']})}><option value="">Not assessed</option><option value="none_identified">No material risks identified in preparation</option><option value="linked">Material risks / exceptions identified</option></select><small>Consider insurance, bonding, indemnity, liability and other contractual exposures. This assessment does not accept residual risks.</small></label>
 {(data.riskAssessment==='linked'||data.riskIds.length>0)&&<><h4>Referenced risks and exceptions</h4>{checklist('riskIds',state.risks)}</>}
 {select('Recorded review decision','reviewDecisionId',state.decisions,'Select the existing decision for later authority verification. Its label alone does not prove approval.')}
 </fieldset>
 <div className="setup-actions"><button disabled={!state.canEdit||busy} onClick={()=>void save()}>{busy?'Working…':pending.current?'Retry save':'Save contract preparation'}</button><button disabled={busy} onClick={()=>void reload()}>Reload saved contract</button></div>
 <h4>Preparation history</h4>{state.history.length?<ul>{state.history.map(v=><li key={v.version}>Version {v.version} · {new Date(v.createdAt).toLocaleString()} · {v.actorUserId}</li>)}</ul>:<p>No contract preparation saved yet.</p>}
 </section>;
}
