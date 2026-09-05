import { FormEvent, useEffect, useMemo, useState } from 'react';
import { type ProjectStateDocumentRevision } from '../../infrastructure/documents/supabaseDocumentRepository';
import { useGovernedProjectStateDocument } from './useGovernedProjectStateDocument';

type DesignConsultantsData = {
  designIntent: string;
  designStage: string;
  leadDesigner: string;
  consultantTeam: string;
  consultantGaps: string;
  coordinationStatus: string;
  deliverables: string;
  approvalsInterfaces: string;
  unknowns: string;
  blockers: string;
  evidenceReferences: string;
  decisions: string;
  notes: string;
};

const empty: DesignConsultantsData = { designIntent:'', designStage:'', leadDesigner:'', consultantTeam:'', consultantGaps:'', coordinationStatus:'', deliverables:'', approvalsInterfaces:'', unknowns:'', blockers:'', evidenceReferences:'', decisions:'', notes:'' };
const text = (v: unknown) => typeof v === 'string' ? v : '';
const fromData = (d: Record<string, unknown>): DesignConsultantsData => ({
  designIntent:text(d.designIntent), designStage:text(d.designStage), leadDesigner:text(d.leadDesigner), consultantTeam:text(d.consultantTeam), consultantGaps:text(d.consultantGaps), coordinationStatus:text(d.coordinationStatus), deliverables:text(d.deliverables), approvalsInterfaces:text(d.approvalsInterfaces), unknowns:text(d.unknowns), blockers:text(d.blockers), evidenceReferences:text(d.evidenceReferences), decisions:text(d.decisions), notes:text(d.notes),
});
const definition = { packageKey:'predevelopment', category:'design_consultants', documentType:'predevelopment_design_consultants', title:'Design & Consultants Review' };

export function DesignConsultantsWorkspace({ projectStateId, projectName, disabled=false, onChanged }: { projectStateId:string; projectName:string; disabled?:boolean; onChanged?:()=>void }) {
  const doc = useGovernedProjectStateDocument(projectStateId, definition);
  const [values,setValues] = useState<DesignConsultantsData>(empty);
  const [editing,setEditing] = useState(false);
  const [historyOpen,setHistoryOpen] = useState(false);
  const active = doc.draft ?? doc.published;

  useEffect(() => { setValues(active ? fromData(active.data) : empty); setEditing(Boolean(doc.draft) || !doc.published); }, [active?.revisionId, doc.draft?.revisionId, doc.published?.revisionId]);
  const canEdit = !disabled && (Boolean(doc.draft) || !doc.published || editing);
  const blockers = useMemo(() => {
    const b:string[]=[];
    if(!values.designIntent.trim()) b.push('Design intent / basis');
    if(!values.designStage.trim()) b.push('Current design stage');
    if(!values.leadDesigner.trim()) b.push('Lead design responsibility');
    if(!values.consultantTeam.trim()) b.push('Consultant team / disciplines');
    if(!values.coordinationStatus.trim()) b.push('Coordination status');
    return b;
  },[values]);
  const set = (key:keyof DesignConsultantsData,value:string)=>setValues(v=>({...v,[key]:value}));
  const field = (key:keyof DesignConsultantsData,label:string,required=false,rows=2)=><label>{label}<small className={required?'field-requirement required':'field-requirement'}>{required?'Required':'Optional'}</small><textarea rows={rows} value={values[key]} disabled={!canEdit||Boolean(doc.busy)} onChange={e=>set(key,e.target.value)}/></label>;

  async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!canEdit||doc.busy)return;try{await doc.save(values);onChanged?.()}catch{/* surfaced by hook */}}
  async function publish(){if(!canEdit||doc.busy)return;doc.setError(null);if(blockers.length){doc.setError(`Cannot publish yet. Complete: ${blockers.join(', ')}.`);return}const note=doc.published?window.prompt('What changed? Briefly explain this revision.'):undefined;if(doc.published&&!note?.trim()){doc.setError('A change note is required for revision 2 and later.');return}if(!window.confirm(`Publish ${doc.draft?`revision ${doc.draft.revisionNumber}`:'Design & Consultants Review'}?`))return;try{await doc.publish(values,note??undefined);setEditing(false);onChanged?.()}catch{/* surfaced by hook */}}
  async function revise(){try{await doc.createRevision();setEditing(true);onChanged?.()}catch{/* surfaced by hook */}}
  async function discard(){if(!doc.draft||!window.confirm('Discard this draft? Unsaved revision work will be removed.'))return;try{await doc.discard();onChanged?.()}catch{/* surfaced by hook */}}
  function cancel(){if(!window.confirm('Cancel editing? Changes since the last save will be lost.'))return;setValues(active?fromData(active.data):empty);setEditing(Boolean(doc.draft)||!doc.published)}

  if(doc.loading)return <div className="document-workspace"><p>Loading Design & Consultants Review…</p></div>;
  const status=doc.draft?'Incomplete':doc.published?'Complete':'Not started';
  return <div className="document-workspace">
    <div className="document-context"><strong>Design & Consultants Review</strong><span className="status-pill">{status}</span><small>{projectName} · Project State {projectStateId}</small></div>
    <p className="guidance">Establish the design basis, accountable design leadership, consultant coverage, coordination state, unresolved interfaces, and evidence needed for a credible predevelopment decision.</p>
    {doc.draft?<div className="revision-banner"><strong>Revision {doc.draft.revisionNumber} draft</strong><span>Working copy</span></div>:null}
    <form className="structured-form" onSubmit={save}>
      <fieldset><legend>Design basis</legend>{field('designIntent','Design intent / basis',true,3)}{field('designStage','Current design stage',true)}{field('leadDesigner','Lead design responsibility',true)}</fieldset>
      <fieldset><legend>Consultant coverage</legend>{field('consultantTeam','Consultant team / required disciplines',true,3)}{field('consultantGaps','Missing / unconfirmed consultants',false,3)}{field('coordinationStatus','Design and consultant coordination status',true,3)}</fieldset>
      <fieldset><legend>Outputs and interfaces</legend>{field('deliverables','Required / available design deliverables',false,3)}{field('approvalsInterfaces','Authority, utility, client, or approval interfaces',false,3)}</fieldset>
      <fieldset><legend>Uncertainty and evidence</legend>{field('unknowns','Known unknowns',false,3)}{field('blockers','Blockers / unresolved constraints',false,3)}{field('evidenceReferences','Evidence / source references',false,3)}</fieldset>
      <fieldset><legend>Decisions and notes</legend>{field('decisions','Decisions / assumptions adopted',false,3)}{field('notes','Project-specific notes',false,3)}</fieldset>
      {canEdit&&blockers.length?<div className="blocking-summary"><strong>Publication incomplete</strong><p>{blockers.length} required item(s) remain: {blockers.join(', ')}.</p></div>:canEdit?<p className="guidance success">Required information complete. Ready to publish.</p>:null}
      {doc.error?<p className="error-message" role="alert">{doc.error}</p>:null}{doc.feedback?<p className="guidance success">{doc.feedback}</p>:null}
      <div className="form-actions">{canEdit?<><button type="submit" disabled={Boolean(doc.busy)}>{doc.busy==='save'?'Saving…':'Save draft'}</button><button type="button" disabled={Boolean(doc.busy)} onClick={()=>void publish()}>{doc.busy==='publish'?'Publishing…':'Publish'}</button><button type="button" className="secondary" disabled={Boolean(doc.busy)} onClick={cancel}>Cancel</button>{doc.draft?<button type="button" className="secondary" disabled={Boolean(doc.busy)} onClick={()=>void discard()}>Discard draft</button>:null}</>:doc.published?<button type="button" disabled={disabled||Boolean(doc.busy)} onClick={()=>void revise()}>{doc.busy==='revision'?'Creating revision…':'Edit'}</button>:null}</div>
    </form>
    {doc.published?<Published revision={doc.published}/>:null}
    {doc.history.length?<div className="revision-history"><button type="button" className="text-button" onClick={()=>setHistoryOpen(v=>!v)}>{historyOpen?'Hide':'Show'} revision history ({doc.history.length})</button>{historyOpen?doc.history.map(r=><article key={r.revisionId}><strong>Revision {r.revisionNumber}</strong><span>{r.state}</span><small>{r.publishedAt?new Date(r.publishedAt).toLocaleString():''} · {r.changeNote||'Initial publication'}</small></article>):null}</div>:null}
  </div>;
}

function Published({revision}:{revision:ProjectStateDocumentRevision}){return <div className="published-summary"><strong>Published revision {revision.revisionNumber}</strong><small>{revision.publishedAt?new Date(revision.publishedAt).toLocaleString():''} · {revision.changeNote||'Initial publication'}</small></div>}
