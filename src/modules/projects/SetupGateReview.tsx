import { useDrawerWorkState } from '../business/WorkspaceDrawer';
import { useRef, useState } from 'react';
import { setupRequirements, type ConditionalObligation, type GateDisposition } from '../../domain/project-state/setupGate';
import { setupRepository, type SetupState } from '../../infrastructure/project-state/setupRepository';
import type { WorkspaceMemberOption } from '../../infrastructure/project-state/supabaseProjectStateRepository';

export function SetupGateReview({ state, members, dirty, onRecorded }: { state: SetupState; members: WorkspaceMemberOption[]; dirty: boolean; onRecorded: (saved: SetupState) => void }) {
  const [authority, setAuthority] = useState('');
  const [disposition, setDisposition] = useState<GateDisposition>('hold');
  const [rationale, setRationale] = useState('');
  const [obligations, setObligations] = useState<ConditionalObligation[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<{ id: string; authority: string; disposition: GateDisposition; rationale: string; obligations: ConditionalObligation[]; version: number } | null>(null);
  useDrawerWorkState(Boolean(rationale.trim()), busy);
  const selectedAuthority = state.authorities.find(a => a.id === authority);
  async function submit() {
    const input = request.current ?? { id: crypto.randomUUID(), authority, disposition, rationale, obligations: disposition === 'conditional_go' ? structuredClone(obligations) : [], version: state.version };
    if (!request.current && !window.confirm(`Record ${input.disposition.replaceAll('_', ' ')} against saved Setup version ${input.version}? This decision becomes permanent history.`)) return;
    request.current = input; setBusy(true); setError('');
    try {
      await setupRepository.decide(state.projectStateId, input.version, input.id, input.authority, input.disposition, input.rationale, input.obligations);
      const saved = await setupRepository.read(state.projectStateId);
      request.current = null; onRecorded(saved); setRationale(''); setObligations([]);
    } catch (e) { setError(`${e instanceof Error ? e.message : 'Decision response unavailable.'} Retry keeps the same request. Reopen Setup to review current history before starting a different decision.`); }
    finally { setBusy(false); }
  }
  return <section className="setup-gate-review">
    <h4>Governed Gate 01 decision</h4>
    <p>Decisions apply to saved version {state.version}. {dirty && 'Save your changes before reviewing.'}</p>
    {!state.authorities.length && <p>No confirmed owner authority or applicable delegation is assigned to your account. Setup preparation can continue.</p>}
    {state.canDecide && state.authorities.length > 0 && <>
      <fieldset disabled={busy || Boolean(request.current) || dirty}>
        <label>Approval authority <select value={authority} onChange={e => setAuthority(e.target.value)}><option value="">Select documented authority</option>{state.authorities.map(a => <option key={a.id} value={a.id}>{a.basis.replaceAll('_', ' ')} · {a.reference}</option>)}</select></label>
        <label>Disposition <select value={disposition} onChange={e => setDisposition(e.target.value as GateDisposition)}><option value="hold">Hold — retain Setup</option><option value="no_go">No-Go — retain Setup</option><option value="go">Go — enter Mobilization</option>{selectedAuthority?.permitsConditionalGo && <option value="conditional_go">Conditional Go — limited advancement</option>}</select></label>
        <label>Decision reason <span className="setup-required">Required</span><textarea value={rationale} onChange={e => setRationale(e.target.value)} /></label>
        {disposition === 'conditional_go' && <>
          <p>Material and contractual blockers cannot be waived. Conditions must remain within the selected authority's explicit limits.</p>
          {(['communications', 'controls'] as const).filter(k => selectedAuthority?.conditionalRequirements.includes(k)).map(key => {
            const condition = obligations.find(o => o.requirement === key);
            function update(patch: Partial<ConditionalObligation>) { setObligations(items => items.map(o => o.requirement === key ? { ...o, ...patch } : o)); }
            return <div key={key}><label><input type="checkbox" checked={Boolean(condition)} onChange={e => setObligations(items => e.target.checked ? [...items, { requirement: key, description: '', reasonToAdvance: '', permittedLimits: '', ownerUserId: '', dueDate: '', dueTrigger: '', consequence: '' }] : items.filter(o => o.requirement !== key))} /> Condition for {key}</label>
              {condition && <div className="setup-section">{([{ key: 'description', label: 'Outstanding obligation' }, { key: 'reasonToAdvance', label: 'Reason advancement is permissible' }, { key: 'permittedLimits', label: 'Permitted limits / excluded work' }, { key: 'consequence', label: 'Consequence if unmet' }, { key: 'dueTrigger', label: 'Due trigger (or enter due date)' }] as const).map(field => <label key={field.key}>{field.label}<textarea value={condition[field.key]} onChange={e => update({ [field.key]: e.target.value })} /></label>)}
                <label>Due date <input type="date" value={condition.dueDate} onChange={e => update({ dueDate: e.target.value })} /></label>
                <label>Accountable owner <select value={condition.ownerUserId} onChange={e => update({ ownerUserId: e.target.value })}><option value="">Select owner</option>{members.map(m => <option key={m.userId} value={m.userId}>{m.label}</option>)}</select></label>
              </div>}
            </div>;
          })}
        </>}
      </fieldset>
      <button className="primary-button" disabled={busy || dirty || !authority || !rationale.trim() || !state.version} onClick={() => void submit()}>{busy ? 'Recording…' : request.current ? 'Retry decision' : 'Record Gate 01 decision'}</button>
    </>}
    {error && <p role="alert">{error}</p>}
    <h4>Decision history and continuing obligations</h4>
    {!state.decisions.length && <p>No Gate 01 decision recorded.</p>}
    {state.decisions.map(d => <article key={d.id} className="setup-section"><strong>{d.disposition.replaceAll('_', ' ')} · {new Date(d.createdAt).toLocaleString()}</strong><p>{d.rationale}</p><p>Approver: {d.actorUserId} · Decision {d.id}</p><details><summary>Frozen decision basis · Setup version {d.setupVersion}</summary><p>Authority: {d.authorityReference}</p>{d.evidence.map(e => <div key={e.requirement}><strong>{setupRequirements.find(r => r.key === e.requirement)?.label}</strong><p>{e.details || 'Unresolved'}</p><p>Evidence: {e.evidenceReference || 'Missing'} · Accountable: {e.accountableUserId || 'Unassigned'}</p></div>)}</details>{d.obligations.map(o => <div key={o.requirement}><strong>Continuing obligation: {o.description}</strong><p>Reason: {o.reasonToAdvance}</p><p>Limits: {o.permittedLimits}</p><p>Owner: {o.ownerUserId} · Due: {o.dueDate || o.dueTrigger}</p><p>Consequence: {o.consequence}</p></div>)}</article>)}
  </section>;
}
