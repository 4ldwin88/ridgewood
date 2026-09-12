import { ScopeBasis } from './ScopeBasis';
import { ObligationPlan } from './ObligationPlan';
import { ContractReview } from './ContractReview';
import { AuthorizedBasis } from './AuthorizedBasis';
import { createRequestId } from '../../infrastructure/project-state/requestId';
import { useEffect, useRef, useState } from 'react';
import { setupRequirements, type SetupEvidence } from '../../domain/project-state/setupGate';
import { setupRepository, type SetupState } from '../../infrastructure/project-state/setupRepository';
import { supabaseProjectStateRepository, type WorkspaceMemberOption } from '../../infrastructure/project-state/supabaseProjectStateRepository';
import { SetupGateReview } from './SetupGateReview';
import { useDrawerWorkState } from '../business/WorkspaceDrawer';
import { WorkspaceModal } from '../business/WorkspaceModal';

const guidance: Record<string, string> = {
  contracting_party: 'Record the legal client/contracting party and the approved delivery name.',
  contract_review: 'Reference the reviewed contract or written authorization and its approval. A folder or proposal alone is insufficient.',
  scope: 'Record the approved scope, exclusions, allowances and owner-supplied items.',
  commercial_terms: 'Record agreed value or fee, payment timing, deposits and commercial qualifications.',
  contractual_risks: 'Record insurance, bonding, indemnity, liability and other material contractual exposures and their disposition.',
  permits: 'Identify each required permit/approval, its status and the responsible party. Explain any not-applicable assessment.',
  leadership: 'Name the Project Lead and coverage for coordination/document control, field leadership where applicable, commercial/finance and oversight. State interim arrangements.',
  budget_basis: 'Reference the initial budget/control basis, assumptions, schedule baseline and responsible reviewer.',
  delivery_folder: 'Reference the authoritative delivery folder and current document locations, using the same Project State identity.',
  access: 'Record team access and restrictions for commercial, personnel and other controlled records.',
  communications: 'Record formal instruction channels, coordination cadence, contacts and escalation routes.',
  controls: 'Identify initialized applicable controls, their owners and locations, plus justified exclusions.',
};
const blankEvidence = (): SetupEvidence[] => setupRequirements.map(r => ({ requirement: r.key, state: 'unresolved', details: '', evidenceReference: '', accountableUserId: '', materialBlocker: false }));

export function ProjectSetup({ projectStateId, onAdvanced }: { projectStateId: string; onAdvanced?: () => void }) {
  const [open, setOpen] = useState(false);
  return <div className="authorization-handoff"><button className="secondary-button" onClick={() => setOpen(true)}>Project Authorization &amp; Setup</button>{open && <WorkspaceModal title="Project Authorization & Setup" onClose={() => setOpen(false)}><SetupEditor key={projectStateId} projectStateId={projectStateId} onAdvanced={onAdvanced} /></WorkspaceModal>}</div>;
}

function SetupEditor({ projectStateId, onAdvanced }: { projectStateId: string; onAdvanced?: () => void }) {
  const [state, setState] = useState<SetupState | null>(null);
  const [evidence, setEvidence] = useState<SetupEvidence[]>(blankEvidence);
  const [members, setMembers] = useState<WorkspaceMemberOption[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [dirty, setDirty] = useState(false);
  const [contractPrepared, setContractPrepared] = useState(false);
  useDrawerWorkState(dirty, busy);
  const pending = useRef<{ id: string; version: number; evidence: SetupEvidence[] } | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([setupRepository.read(projectStateId), supabaseProjectStateRepository.workspaceMembers()]).then(([saved, people]) => {
      if (!active) return;
      setState(saved); setMembers(people); setEvidence(saved.evidence.length ? saved.evidence : blankEvidence());
    }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Setup could not load.'); });
    return () => { active = false; };
  }, [projectStateId]);

  function change(index: number, patch: Partial<SetupEvidence>) {
    setEvidence(items => items.map((item, i) => i === index ? { ...item, ...patch } : item));
    setDirty(true); setMessage('');
  }
  async function save() {
    if (!state) return;
    // A lost response retains the exact request, rather than creating another version.
    setBusy(true); setError('');
    try {
      const request = pending.current ?? { id: createRequestId(), version: state.version, evidence: structuredClone(evidence) };
      pending.current = request;
      const saved = await setupRepository.save(projectStateId, request.version, request.id, request.evidence);
      setState(saved); setEvidence(saved.evidence); setDirty(false); pending.current = null;
      setMessage(`Saved version ${saved.savedVersion ?? saved.version}. Gate approval has not been granted.`);
    } catch (e) {
      const text = e instanceof Error ? e.message : 'Save response unavailable.';
      setError(text.includes('setup_version_conflict') ? 'Another version was saved. Your entries remain here; reload the saved version before editing again.' : `${text} Your entries remain here. Retry uses the same save request.`);
    } finally { setBusy(false); }
  }
  async function reload() {
    if ((dirty || pending.current) && !window.confirm('Replace these entries with the latest saved Setup version?')) return;
    setBusy(true); setError('');
    try {
      const saved = await setupRepository.read(projectStateId);
      setState(saved); setEvidence(saved.evidence.length ? saved.evidence : blankEvidence());
      pending.current = null; setDirty(false); setMessage('Latest saved version loaded.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Reload failed.'); }
    finally { setBusy(false); }
  }
  if (!state) return <div className="stage-tool-surface">{error ? <p role="alert">{error}</p> : <p>Loading Setup…</p>}</div>;
  const locked = !state.canEdit || busy || Boolean(pending.current);
  return <div className="stage-tool-surface setup-workspace">
    <p>Prepare the project for Gate 01. Saving records evidence and responsibilities; it does not authorize work or commitments.</p>
    <p>Project State: {projectStateId}</p>
    {state.authorizationRecordId ? <AuthorizedBasis projectStateId={projectStateId} authorizationRecordId={state.authorizationRecordId} /> : <p role="alert">Frozen authorization missing — Setup cannot be saved.</p>}
    <ContractReview projectStateId={projectStateId} onSaved={() => { setContractPrepared(true); void setupRepository.read(projectStateId).then(setState).catch(e => setError(e instanceof Error ? e.message : 'Reload Setup readiness.')); }} />
    <ScopeBasis projectStateId={projectStateId} onSaved={() => { void setupRepository.read(projectStateId).then(setState).catch(() => setError('Reload Setup readiness.')); }} />
    <ObligationPlan projectStateId={projectStateId} onSaved={() => { void setupRepository.read(projectStateId).then(setState).catch(() => setError('Reload Setup readiness.')); }} />
    <p role="status">{message || `Saved version ${state.version} · ${state.unmet.length} unresolved requirements`}{dirty ? ' · Unsaved changes' : ''}</p>
    {error && <p role="alert" className="error-message">{error}</p>}
    {!state.canEdit && <p>This record is read-only for your access or the current project state.</p>}
    {evidence.map((row, index) => <details key={row.requirement} className="setup-section">
      <summary>{setupRequirements.find(r => r.key === row.requirement)?.label} · {state.unmet.includes(row.requirement) ? 'Needs evidence' : 'Ready'}</summary>
      <p>{guidance[row.requirement]}</p>
      {(contractPrepared || Boolean(state.contractPreparationVersion)) && ['contracting_party','contract_review','commercial_terms','contractual_risks'].includes(row.requirement) && <p>These contractual checks reference the current 5.2 review. Edit preparation and record authorized decisions in 5.2.</p>}
      {row.requirement === 'scope' && state.scopePreparationVersion && <p>Scope is owned by 5.3. This earlier checklist remains historical; review the current preparation in its numbered tool.</p>}
      {row.requirement === 'permits' && Boolean(state.obligationPlanVersion) && <p>Obligations are owned by 5.4. This checklist is historical and cannot clear the plan review requirement.</p>}
      <fieldset disabled={locked || (row.requirement === 'permits' && Boolean(state.obligationPlanVersion)) || (row.requirement === 'scope' && Boolean(state.scopePreparationVersion)) || (contractPrepared || Boolean(state.contractPreparationVersion)) && ['contracting_party','contract_review','commercial_terms','contractual_risks'].includes(row.requirement)}>
        <label>Assessment <span className="setup-required">Required</span><select value={row.state} onChange={e => change(index, { state: e.target.value as SetupEvidence['state'] })}><option value="unresolved">Unresolved</option><option value="satisfied">Satisfied with evidence</option>{row.requirement === 'permits' && <option value="not_applicable">Not applicable with reason</option>}</select></label>
        <label>Reviewed basis and responsibilities <span className="setup-required">Required for readiness</span><textarea rows={4} value={row.details} onChange={e => change(index, { details: e.target.value })} /></label>
        <label>Controlling document / evidence reference <span className="setup-required">Required for readiness</span><input value={row.evidenceReference} onChange={e => change(index, { evidenceReference: e.target.value })} /></label>
        <label>Accountable person <span className="setup-required">Required for readiness</span><select value={row.accountableUserId} onChange={e => change(index, { accountableUserId: e.target.value })}><option value="">Assign a person</option>{members.map(m => <option key={m.userId} value={m.userId}>{m.label}</option>)}</select></label>
        {row.requirement === 'leadership' && <>
          {['project_lead', 'coordination_document_control', 'commercial_finance', 'oversight'].map(role => <label key={role}>{role.replaceAll('_', ' ')} <span className="setup-required">Required coverage</span><select value={row.roleAssignments?.[role] ?? ''} onChange={e => change(index, { roleAssignments: { ...row.roleAssignments, [role]: e.target.value } })}><option value="">Assign responsible person</option>{members.map(m => <option key={m.userId} value={m.userId}>{m.label}</option>)}</select></label>)}
          <label>Field leadership applicability<select value={row.fieldLeadership ?? ''} onChange={e => change(index, { fieldLeadership: e.target.value as 'required' | 'not_applicable' })}><option value="">Assess applicability</option><option value="required">Required</option><option value="not_applicable">Not applicable at Setup</option></select></label>
          {row.fieldLeadership === 'required' ? <label>Field leadership owner<select value={row.roleAssignments?.field_lead ?? ''} onChange={e => change(index, { roleAssignments: { ...row.roleAssignments, field_lead: e.target.value } })}><option value="">Assign responsible person</option>{members.map(m => <option key={m.userId} value={m.userId}>{m.label}</option>)}</select></label> : row.fieldLeadership === 'not_applicable' && <label>Field leadership applicability reason<textarea value={row.fieldLeadershipReason ?? ''} onChange={e => change(index, { fieldLeadershipReason: e.target.value })} /></label>}
        </>}
        <label><input type="checkbox" checked={row.materialBlocker} onChange={e => change(index, { materialBlocker: e.target.checked })} /> Material unresolved condition / blocker</label>
        {row.state === 'not_applicable' && <label>Not-applicable reason <span className="setup-required">Required</span><textarea value={row.notApplicableReason ?? ''} onChange={e => change(index, { notApplicableReason: e.target.value })} /></label>}
      </fieldset>
    </details>)}
    <div className="setup-actions"><button className="primary-button" disabled={!state.canEdit || busy} onClick={() => void save()}>{busy ? 'Saving…' : pending.current ? 'Retry save' : 'Save Setup'}</button><button className="secondary-button" disabled={busy} onClick={() => void reload()}>Reload saved version</button></div>
    <h4>Gate 01 readiness</h4><p>Readiness uses the saved version. {state.approvalBlocker}</p>
    <ul>{state.unmet.map(k => <li key={k}>{setupRequirements.find(r => r.key === k)?.label}</li>)}</ul>
    <SetupGateReview state={state} members={members} dirty={dirty || Boolean(pending.current)} onRecorded={saved => { if (saved.stage === 'preconstruction_mobilization') onAdvanced?.(); setState(saved); setEvidence(saved.evidence); setMessage(`Gate decision recorded. Current stage: ${saved.stage.replaceAll('_', ' ')}`); }} /><h4>Save history</h4>{state.history.length ? <ul>{state.history.map(h => <li key={h.version}>Version {h.version} · {new Date(h.createdAt).toLocaleString()} · {h.actorUserId}</li>)}</ul> : <p>No Setup version saved yet.</p>}
  </div>;
}
