import { useRef, useState } from 'react';
import { contractRepository, ContractSaveError, type ContractState, type ContractDecisionInput, type ReviewConfirmations, type ReviewOutcome } from '../../infrastructure/project-state/contractRepository';
import { createRequestId } from '../../infrastructure/project-state/requestId';
import { useDrawerWorkState } from '../business/WorkspaceDrawer';

const blankConfirmations = ():ReviewConfirmations=>({agreementAuthorized:false,commercialTermsReviewed:false,effectivenessReviewed:false,noMaterialBlockers:false});
export function ContractDecision({state,blocked,onRecorded,onWorkChange}:{state:ContractState;blocked:boolean;onRecorded:(s:ContractState)=>void;onWorkChange:(dirty:boolean,busy:boolean)=>void}){
 const [authorityId,setAuthorityId]=useState(''),[outcome,setOutcome]=useState<ReviewOutcome|''>(''),[rationale,setRationale]=useState('');
 const [confirmations,setConfirmations]=useState(blankConfirmations),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const request=useRef<ContractDecisionInput|null>(null);
 const dirty=Boolean(authorityId||outcome||rationale||Object.values(confirmations).some(Boolean)||request.current);
 useDrawerWorkState(dirty,busy);
 // Parent preparation must not save/reload while this decision has unsaved work.
 function work(d:boolean,b=false){onWorkChange(d,b);}
 async function submit(){
  if(busy||blocked||!outcome)return;
  if(!request.current&&!window.confirm(`Record ${outcome} for contract version ${state.version}? This internal review decision is permanent history; it does not sign an agreement or advance the project.`))return;
  setBusy(true);work(true,true);setError('');setMessage('');
  try{
   const input=request.current??{id:createRequestId(),version:state.version,sequence:state.reviewSequence??0,authorityId,outcome,rationale,confirmations:structuredClone(confirmations)};request.current=input;
   const saved=await contractRepository.decide(state.projectStateId,input);
   request.current=null;setAuthorityId('');setOutcome('');setRationale('');setConfirmations(blankConfirmations());work(false);
   onRecorded(saved);setMessage(`Decision recorded: ${input.outcome}.`);
  }catch(e){
   if(e instanceof ContractSaveError&&e.code==='P0001')request.current=null;
   const code=e instanceof Error?e.message:'';
   const messages:Record<string,string>={contract_strong_verification_required:'A live session with recent TOTP verification is required. Reload after verification.',contract_owner_authority_required:'Confirmed owner authority is missing, expired or revoked.',missing_contract_review_permission:'Your access does not permit contract decisions.',contract_version_conflict:'The preparation changed. Close this decision and reload the contract.',contract_review_sequence_conflict:'Another decision was recorded. Close this decision and reload the contract.',contract_risk_resolution_required:'Linked risks or material blockers need governed resolution before approval.',contract_agreement_expired:'The agreement has expired.',contract_agreement_not_effective:'The agreement is not yet effective.',contract_agreement_not_current:'The selected agreement publication is no longer current.',review_confirmations_required:'Confirm each required review check before approval.',contract_review_request_required:'Request review of this saved version first.'};
   setError(`${messages[code]??'The decision could not be recorded.'} ${request.current?'Retry retains the exact request.':'Your review entries remain here.'}`);work(true);
  }finally{setBusy(false);}
 }
 const access=state.reviewAccess;
 const canPrepare=Boolean(access?.hasPermission&&access.ownerAuthorities.length);
 const pendingRequest=state.reviewRequests?.some(r=>r.version===state.version);
 return <section className="setup-gate-review">
  <h4>5.2.3 Authorized contract decision</h4>
  <p>Current basis: {state.status.replaceAll('_',' ')}. Approval applies only to the reviewed contract version. Signing, spending and Gate 01 are separate commands.</p>
  {!canPrepare&&<p>No confirmed owner authority and review permission are available to your account. A role, membership or Project Lead assignment does not grant approval.</p>}
  {canPrepare&&<>
   {!access?.strongSession&&<p>Recent strong verification is required before recording a decision. This preview does not enroll or change authentication factors.</p>}
   {!pendingRequest&&<p>Request review of the saved preparation before recording a decision.</p>}
   <fieldset disabled={blocked||busy||Boolean(request.current)}>
    <label>Owner authority <span className="setup-required">Required</span><select value={authorityId} onChange={e=>{setAuthorityId(e.target.value);work(true);}}><option value="">Select verified owner evidence</option>{access?.ownerAuthorities.map(a=><option key={a.id} value={a.id}>{a.reference}</option>)}</select></label>
    <label>Review outcome <span className="setup-required">Required</span><select value={outcome} onChange={e=>{setOutcome(e.target.value as ReviewOutcome|'');setConfirmations(blankConfirmations());work(true);}}><option value="">Select an outcome</option><option value="approved">Approve the contract basis</option><option value="held">Hold for correction or evidence</option><option value="rejected">Reject the contract basis</option></select></label>
    <label>Decision reason <span className="setup-required">Required</span><textarea maxLength={4000} value={rationale} placeholder="Example: Hold until written authorization covers the stated scope" onChange={e=>{setRationale(e.target.value);work(true);}}/></label>
    {outcome==='approved'&&<div className="contract-choices">{([
     ['agreementAuthorized','I verified the exact agreement or written authorization and its legal parties.'],
     ['commercialTermsReviewed','I reviewed the stated value or fee, payment terms and commercial obligations.'],
     ['effectivenessReviewed','I verified applicable effectiveness and expiry requirements against the agreement.'],
     ['noMaterialBlockers','No unresolved material contractual, legal, insurance or client-authorization blocker prevents this approval.'],
    ] as const).map(([key,label])=><label key={key}><input type="checkbox" checked={confirmations[key]} onChange={e=>{setConfirmations(c=>({...c,[key]:e.target.checked}));work(true);}}/>{label}<span className="setup-required">Required</span></label>)}</div>}
   </fieldset>
   <button disabled={blocked||busy||!authorityId||!outcome||!rationale.trim()||!pendingRequest||(!request.current&&!access?.strongSession)} onClick={()=>void submit()}>{busy?'Recording…':request.current?'Retry contract decision':'Record contract decision'}</button>
  </>}
  {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
  <h4>Contract decision history</h4>
  {state.reviewDecisions?.length?<ul>{state.reviewDecisions.map(d=><li key={d.id}><strong>Version {d.version} · {d.outcome}</strong><p>{d.rationale}</p><p>{new Date(d.createdAt).toLocaleString()} · {d.actorUserId}</p><details><summary>Verified authority and review record</summary><p>{d.authorityReference}</p><p>Decision: {d.id}</p></details></li>)}</ul>:<p>No authorized contract decision recorded.</p>}
 </section>;
}
