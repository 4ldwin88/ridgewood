import { useEffect, useRef, useState } from 'react';
import { blankContract, contractRepository, ContractSaveError, type ContractData, type ContractState, type ContractOption } from '../../infrastructure/project-state/contractRepository';
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
 const pendingReview=useRef<{id:string;version:number}|null>(null);
 useDrawerWorkState(dirty||Boolean(pendingReview.current),busy);
 useEffect(()=>{let active=true;contractRepository.read(projectStateId).then(s=>{if(active){setState(s);setData(s.data??blankContract());}}).catch(e=>{if(active)setError(e instanceof Error?e.message:'Contract preparation could not load.');});return()=>{active=false;};},[projectStateId]);
 const change=(patch:Partial<ContractData>)=>{setData(v=>({...v,...patch}));setDirty(true);setMessage('');};
 async function reload(){
  if((dirty||pending.current||pendingReview.current)&&!window.confirm('Replace these entries with the latest saved contract preparation and review request status?'))return;
  setBusy(true);setError('');
  try{const s=await contractRepository.read(projectStateId);setState(s);setData(s.data??blankContract());pending.current=null;pendingReview.current=null;setDirty(false);setMessage('Latest saved contract preparation loaded.');}
  catch(e){setError(e instanceof Error?e.message:'Reload failed.');}finally{setBusy(false);}
 }
 async function requestReview(){
  if(!state||busy||dirty||pending.current)return;
  setBusy(true);setError('');setMessage('');
  try{
   const request=pendingReview.current??{id:createRequestId(),version:state.version};pendingReview.current=request;
   const s=await contractRepository.requestReview(projectStateId,request.version,request.id);
   setState(s);setData(s.data??blankContract());pendingReview.current=null;onSaved?.();
   setMessage(`Review requested for version ${s.submittedVersion}. No approval granted.`);
  }catch(e){
   if(e instanceof ContractSaveError && e.code==='P0001')pendingReview.current=null;
   const reason=e instanceof Error?e.message:'';
   const messages:Record<string,string>={contract_version_conflict:'The saved contract changed. Reload before requesting review.',contract_review_already_requested:'Review was already requested for this version. Reload to see it.',missing_setup_edit_permission:'Your access does not permit review requests.',contract_edit_not_allowed:'This project no longer permits a new review request.',save_contract_before_request:'Save a contract preparation before requesting review.'};
   setError(`${messages[reason]??'The review request could not be confirmed.'} ${pendingReview.current?'Retry uses the same request to avoid duplicates.':'Reload the saved contract to check its current status.'}`);
  }finally{setBusy(false);}
 }
 async function save(){
  if(!state)return;setBusy(true);setError('');
  try{const request=pending.current??{id:createRequestId(),version:state.version,data:structuredClone(data)};pending.current=request;const s=await contractRepository.save(projectStateId,request.version,request.id,request.data);setState(s);setData(s.data??blankContract());pending.current=null;setDirty(false);onSaved?.();setMessage(`Saved preparation version ${s.savedVersion??s.version}. No approval granted.`);}
  catch(e){
   const reason=e instanceof Error?e.message:'';
   // A confirmed database rejection did not commit; let the user correct inputs.
   // An uncertain/lost response retains the exact request for recovery.
   if(e instanceof ContractSaveError && ['P0001','22007','22008'].includes(e.code) && reason!=='contract_version_conflict')pending.current=null;
   const messages:Record<string,string>={contract_version_conflict:'Another version was saved. Reload the saved contract before continuing.',invalid_contract_money:'Enter a non-negative amount with at most two decimal places and a three-letter currency.',invalid_contract_date_order:'The expiry date must not precede the effective date.',invalid_contract_party:'A selected legal party is unavailable or removed from new selections.',invalid_contract_agreement:'Select an available published agreement revision from this project.',invalid_contract_evidence:'Select evidence belonging to this project.',invalid_contract_risk:'Select risks belonging to this project.',invalid_contract_decision:'Select a decision belonging to this project.',missing_setup_edit_permission:'Your access does not permit contract preparation changes.',contract_edit_not_allowed:'This project no longer permits changes to contract preparation.',missing_frozen_authorization:'A frozen authorization record is required before saving.'};
   setError(`${messages[reason]??'Contract preparation could not be saved.'} Your entries remain here. ${pending.current?'Retry preserves the same request; reload to resolve a version conflict.':'Correct the entry or access issue, then save again.'}`);
  }finally{setBusy(false);}
 }
 if(!state)return <div>{error?<><p role="alert">{error}</p><button disabled={busy} onClick={()=>void reload()}>Retry loading contract</button></>:<p role="status">Loading contract preparation…</p>}</div>;
 const locked=!state.canEdit||busy||Boolean(pending.current)||Boolean(pendingReview.current);
 const required=<span className="setup-required">Required for review</span>;
 const optional=<span className="optional-label">Optional</span>;
 const select=(label:string,key:'agreementRevisionId'|'agreementEvidenceId'|'reviewDecisionId',options:ContractOption[],hint:string)=><label>{label} {key==='agreementEvidenceId'?optional:required}<select value={data[key]} onChange={e=>change({[key]:e.target.value})}><option value="">Select an existing record</option>{options.map(o=><option value={o.id} key={o.id}>{o.label}</option>)}</select><small>{hint}</small></label>;
 const checklist=(key:'partyIds'|'riskIds',options:ContractOption[])=><div className="contract-choices">{options.length?options.map(o=><label key={o.id}><input type="checkbox" checked={data[key].includes(o.id)} disabled={locked||(o.retired&&!state.data?.[key].includes(o.id))} onChange={e=>change({[key]:e.target.checked?[...data[key],o.id]:data[key].filter(id=>id!==o.id)})}/>{o.label}{o.retired?' · Removed from new selections':''}</label>):<p>No linked records available yet.</p>}</div>;
 return <section className="stage-tool-surface contract-review">
 <h4>5.2.1 Contract preparation</h4><p>Prepare the contractual basis once. Agreement and risk references use existing project records; legal parties use the organization register.</p>
 <p role="status" aria-label="Contract save status">{message||`Saved preparation version ${state.version}`}{dirty?' · Unsaved changes':''}</p>
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
 <div className="setup-actions"><button disabled={!state.canEdit||busy||Boolean(pendingReview.current)} onClick={()=>void save()}>{busy?'Working…':pending.current?'Retry save':'Save contract preparation'}</button><button disabled={busy} onClick={()=>void reload()}>Reload saved contract</button></div>
 <h4>5.2.2 Request authorized review</h4>
 <p>Record a review request against the saved preparation version and its frozen references. Missing terms and evidence remain unresolved; requesting review does not accept risks, sign the agreement or authorize work.</p>
 <p>Approval is unavailable until the governing authority and review controls are implemented and verified. Requests are recorded here; no reviewer notification is sent.</p>
 {dirty&&<p>Save your changes before requesting review.</p>}
 <button disabled={!state.canEdit||busy||dirty||Boolean(pending.current)||state.version===0||(!pendingReview.current&&state.reviewRequests?.some(r=>r.version===state.version))} onClick={()=>void requestReview()}>{pendingReview.current?'Retry review request':'Request authorized review'}</button>
 <h4>Review requests</h4>
 {state.reviewRequests?.length?<ul aria-label="Contract review requests">{state.reviewRequests.map(r=><li key={r.id}>Version {r.version} · {r.status==='pending'?'Pending authorized review':'Superseded by a newer preparation'} · {new Date(r.createdAt).toLocaleString()} · {r.actorUserId}</li>)}</ul>:<p>No review requested.</p>}
 <h4>Preparation history</h4>{state.history.length?<ul>{state.history.map(v=><li key={v.version}>Version {v.version} · {new Date(v.createdAt).toLocaleString()} · {v.actorUserId}</li>)}</ul>:<p>No contract preparation saved yet.</p>}
 </section>;
}
