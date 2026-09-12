import { useRef, useState } from 'react';
import { scopeRepository, ScopeCommandError, type ScopeState, type ScopeDecisionInput, type ScopeConfirmations, type ScopeOutcome } from '../../infrastructure/project-state/scopeRepository';
import { createRequestId } from '../../infrastructure/project-state/requestId';
import { useDrawerWorkState } from '../business/WorkspaceDrawer';

const blankConfirmations = ():ScopeConfirmations=>({withinAuthorizedBasis:false,boundariesReviewed:false,noUnresolvedScopeBlockers:false});
export function ScopeDecision({state,blocked,onRecorded,onWorkChange}:{state:ScopeState;blocked:boolean;onRecorded:(s:ScopeState)=>void;onWorkChange:(dirty:boolean,busy:boolean)=>void}){
 const [authorityId,setAuthorityId]=useState(''),[outcome,setOutcome]=useState<ScopeOutcome|''>(''),[rationale,setRationale]=useState('');
 const [confirmations,setConfirmations]=useState(blankConfirmations),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const request=useRef<ScopeDecisionInput|null>(null);
 const dirty=Boolean(authorityId||outcome||rationale||Object.values(confirmations).some(Boolean)||request.current);
 useDrawerWorkState(dirty,busy);
 // Parent preparation must not save/reload while this decision has unsaved work.
 function work(d:boolean,b=false){onWorkChange(d,b);}
 async function submit(){
  if(busy||blocked||!outcome)return;
  if(!request.current&&!window.confirm(`Record ${outcome} for scope version ${state.version}? This records the exact reviewed scope. It does not sign a contract, authorize spending or advance the project.`))return;
  setBusy(true);work(true,true);setError('');setMessage('');
  try{
   const input=request.current??{id:createRequestId(),version:state.version,sequence:state.reviewSequence??0,authorityId,outcome,rationale,confirmations:structuredClone(confirmations)};request.current=input;
   const saved=await scopeRepository.decide(state.projectStateId,input);
   request.current=null;setAuthorityId('');setOutcome('');setRationale('');setConfirmations(blankConfirmations());work(false);
   onRecorded(saved);setMessage(`Decision recorded: ${input.outcome}.`);
  }catch(e){
   if(e instanceof ScopeCommandError&&e.code==='P0001')request.current=null;
   const code=e instanceof Error?e.message:'';
   const messages:Record<string,string>={scope_queries_unresolved:'Resolve open scope questions and potential changes before approval.',scope_strong_verification_required:'A live session with recent TOTP verification is required. Reload after verification.',scope_owner_authority_required:'Confirmed owner authority is missing, expired or revoked.',missing_scope_review_permission:'Your access does not permit scope decisions.',scope_version_conflict:'The scope preparation changed. Reload before reviewing again.',scope_review_sequence_conflict:'Another decision was recorded. Reload before reviewing again.',scope_contract_approval_required:'A current authorized contract decision is required.',scope_source_not_current:'A referenced publication is no longer current.',scope_confirmations_required:'Confirm each required review check before approval.',scope_review_request_required:'Request review of this saved version first.',scope_material_resolution_required:'A material scope blocker needs governed resolution.',scope_authorization_basis_mismatch:'Scope and contract must refer to the same frozen authorization.',scope_change_approval_required:'Later preparations require governed change approval. The initial baseline cannot be replaced here.'};
   setError(`${messages[code]??'The decision could not be recorded.'} ${request.current?'Retry retains the exact request.':'Your review entries remain here.'}`);work(true);
  }finally{setBusy(false);}
 }
 const access=state.reviewAccess;
 const canPrepare=Boolean(access?.hasPermission&&access.ownerAuthorities.length);
 const pendingRequest=state.requests?.some(r=>r.version===state.version);
 return <section className="setup-gate-review">
  <h4>5.3.3 Authorized scope decision</h4>
  <p>Current basis: {state.status.replaceAll('_',' ')}. Approval establishes the initial scope baseline against the current contract decision. Signing, spending, changed work and Gate 01 remain separate.</p>
  {state.approvalBlockers.length>0&&<ul>{state.approvalBlockers.map(reason=><li key={reason}>{reason}</li>)}</ul>}
  {!canPrepare&&<p>No confirmed owner authority and review permission are available to your account. A role, membership or Project Lead assignment does not grant approval.</p>}
  {canPrepare&&<>
   {!access?.strongSession&&<p>Recent strong verification is required before recording a decision. This preview does not enroll or change authentication factors.</p>}
   {!pendingRequest&&<p>Request review of the saved preparation before recording a decision.</p>}
   <fieldset disabled={blocked||busy||Boolean(request.current)}>
    <label>Owner authority <span className="setup-required">Required</span><select value={authorityId} onChange={e=>{setAuthorityId(e.target.value);work(true);}}><option value="">Select verified owner evidence</option>{access?.ownerAuthorities.map(a=><option key={a.id} value={a.id}>{a.reference}</option>)}</select></label>
    <label>Review outcome <span className="setup-required">Required</span><select value={outcome} onChange={e=>{setOutcome(e.target.value as ScopeOutcome|'');setConfirmations(blankConfirmations());work(true);}}><option value="">Select an outcome</option><option value="approved" disabled={Boolean(state.baseline&&state.baseline.version!==state.version)}>Approve the initial scope baseline</option><option value="held">Hold for correction or evidence</option><option value="rejected">Reject the initial scope baseline</option></select></label>
    <label>Decision reason <span className="setup-required">Required</span><textarea maxLength={4000} value={rationale} placeholder="Example: Hold until written authorization covers the stated scope" onChange={e=>{setRationale(e.target.value);work(true);}}/></label>
    {outcome==='approved'&&<div className="contract-choices">{([
     ['withinAuthorizedBasis','I verified that these scope items remain within the frozen authorization and current approved contract basis.'],
     ['boundariesReviewed','I reviewed inclusions, exclusions, allowances, interfaces, responsible parties and acceptance sources.'],
     ['noUnresolvedScopeBlockers','No unresolved scope gap or material blocker prevents this baseline; no unapproved changed work is included.'],
    ] as const).map(([key,label])=><label key={key}><input type="checkbox" checked={confirmations[key]} onChange={e=>{setConfirmations(c=>({...c,[key]:e.target.checked}));work(true);}}/><span>{label} <span className="setup-required">Required</span></span></label>)}</div>}
   </fieldset>
   <button disabled={blocked||busy||!authorityId||!outcome||!rationale.trim()||!pendingRequest||(!request.current&&!access?.strongSession)} onClick={()=>void submit()}>{busy?'Recording…':request.current?'Retry scope decision':'Record scope decision'}</button>
  </>}
  {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
  <h4>Scope decision history</h4>
  {state.reviewDecisions?.length?<ul>{state.reviewDecisions.map(d=><li key={d.id}><strong>Version {d.version} · {d.outcome}</strong><p>{d.rationale}</p><p>{new Date(d.createdAt).toLocaleString()} · {d.actorUserId}</p><details><summary>Verified authority and review record</summary><p>{d.authorityReference}</p><p>Decision: {d.id}</p></details></li>)}</ul>:<p>No authorized scope decision recorded.</p>}
 </section>;
}
