import { useEffect, useRef, useState } from 'react';
import { obligationRepository, ObligationCommandError, type ObligationPlanItem, type ObligationPlanState } from '../../infrastructure/project-state/obligationRepository';
import { createRequestId } from '../../infrastructure/project-state/requestId';
import { WorkspaceModal } from '../business/WorkspaceModal';
import { useDrawerWorkState } from '../business/WorkspaceDrawer';
import { PublishedDocumentView } from '../business/PublishedDocumentView';

const required = <span className="setup-required">Required for plan</span>;
const optional = <span className="optional-label">Optional</span>;

export function ObligationPlan({ projectStateId, onSaved }: { projectStateId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  return <div className="authorization-handoff">
    <button className="secondary-button" onClick={() => setOpen(true)}>5.4 Permits &amp; Responsibilities</button>
    {open && <WorkspaceModal title="5.4 Permits & Responsibilities" onClose={() => setOpen(false)}>
      <PlanEditor key={projectStateId} projectStateId={projectStateId} onSaved={onSaved} />
    </WorkspaceModal>}
  </div>;
}

function PlanEditor({ projectStateId, onSaved }: { projectStateId: string; onSaved: () => void }) {
  const [state, setState] = useState<ObligationPlanState | null>(null);
  const [items, setItems] = useState<ObligationPlanItem[]>([]);
  const [dirty, setDirty] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [message, setMessage] = useState('');
  const [sourceSearch, setSourceSearch] = useState('');
  const pending = useRef<{ id: string; version: number; items: ObligationPlanItem[] } | null>(null);
  useDrawerWorkState(dirty || Boolean(pending.current), busy);
  useEffect(() => {
    let active = true;
    obligationRepository.read(projectStateId).then(s => { if (active) { setState(s); setItems(s.items); } })
      .catch(() => { if (active) setError('The obligation plan could not load. Retry to recover its saved state.'); });
    return () => { active = false; };
  }, [projectStateId]);

  async function reload() {
    if ((dirty || pending.current) && !window.confirm('Replace these entries with the latest saved obligation plan?')) return;
    setBusy(true); setError('');
    try {
      const s = await obligationRepository.read(projectStateId);
      setState(s); setItems(s.items); pending.current = null; setDirty(false); setMessage('Latest saved plan loaded.');
    } catch { setError('The obligation plan could not load. Try again.'); }
    finally { setBusy(false); }
  }
  function change(id: string, patch: Partial<ObligationPlanItem>) {
    setItems(rows => rows.map(row => row.id === id ? { ...row, ...patch } : row));
    setDirty(true); setMessage('');
  }
  async function save() {
    if (!state || busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const request = pending.current ?? { id: createRequestId(), version: state.version, items: structuredClone(items) };
      pending.current = request;
      const s = await obligationRepository.save(projectStateId, request.version, request.id, request.items);
      pending.current = null; setState(s); setItems(s.items); setDirty(false); onSaved();
      setMessage(`Saved obligation plan version ${s.savedVersion}. No permit or obligation has been verified.`);
    } catch (e) {
      if (e instanceof ObligationCommandError && e.code === 'P0001') pending.current = null;
      const messages: Record<string, string> = {
        obligation_version_conflict: 'Another plan was saved. Reload before continuing.',
        invalid_obligation_date: 'Enter a valid calendar date.',
        invalid_obligation_source: 'Choose a published source from this project.',
        invalid_obligation_owner: 'Choose an active accountable person from this workspace.',
        obligation_removal_requires_governance: 'Previously saved obligations cannot be removed through preparation.',
        missing_setup_edit_permission: 'Your access does not permit Setup preparation.',
        obligation_edit_not_allowed: 'The current project state no longer permits Setup preparation.',
      };
      setError(`${messages[e instanceof Error ? e.message : ''] ?? 'The plan could not be saved.'} ${pending.current ? 'Retry preserves the exact request.' : 'Your entries remain here.'}`);
    } finally { setBusy(false); }
  }
  if (!state) return <div>{error ? <><p role="alert">{error}</p><button disabled={busy} onClick={() => void reload()}>Retry loading obligation plan</button></> : <p>Loading obligation plan…</p>}</div>;
  const locked = !state.canEdit || busy || Boolean(pending.current);
  return <section className="stage-tool-surface contract-review obligation-plan">
    <h4>5.4.1 Obligation planning</h4>
    <p>Identify what must be obtained or done, who is accountable and when it is needed. Later stages use these same obligations to verify evidence.</p>
    <p>Saving a plan does not issue a permit, accept an exemption or prove completion. A separate applicability/readiness review is still required before this plan can support Gate 01.</p>
    <p>Frozen authorization: {state.authorizationRecordId ?? 'Missing — recover authorization first'}. Saved plan: {state.version ? state.planComplete ? 'Required planning fields recorded' : 'Incomplete' : 'Not started'}.</p>
    {!state.canEdit && <p>Read-only for your access or the current project stage.</p>}
    <label>Find a governing source {optional}<input type="search" value={sourceSearch} onChange={e => setSourceSearch(e.target.value)} placeholder="Filter published drawings, specifications or agreements" /><small>Filters the source pickers without changing saved references.</small></label>
    {items.map((item, index) => <article className="setup-section" key={item.id}>
      <h4>Obligation {index + 1}</h4>
      <fieldset disabled={locked}>
        <label>Type {required}<select value={item.type} onChange={e => change(item.id, { type: e.target.value as ObligationPlanItem['type'] })}>
          <option value="">Unassessed</option><option value="contract">Contract</option><option value="permit">Permit</option><option value="insurance">Insurance</option><option value="safety_regulatory">Safety / Regulatory</option><option value="warranty">Warranty</option><option value="other">Other sourced obligation</option>
        </select><small>Gate conditions come from their authorized decisions; do not recreate them here.</small></label>
        <label>Requirement {required}<textarea maxLength={500} value={item.requirement} placeholder="Example: Obtain the issued building permit before excavation" onChange={e => change(item.id, { requirement: e.target.value })} /><small>State one obligation supported by the selected source. For Other, explain what it requires.</small></label>
        <label>Governing source {required}<select value={item.sourceRevisionId} onChange={e => change(item.id, { sourceRevisionId: e.target.value })}>
          <option value="">Select a published revision</option>
          {state.sources.filter(s => s.id === item.sourceRevisionId || s.label.toLowerCase().includes(sourceSearch.toLowerCase())).map(s => <option key={s.id} value={s.id}>{s.label}{s.state === 'superseded' ? ' · Superseded' : ''}</option>)}
        </select><small>Use the existing exact document revision. Saving freezes the referenced evidence in plan history.</small></label>
        <label>Accountable person {required}<select value={item.ownerUserId} onChange={e => change(item.id, { ownerUserId: e.target.value })}>
          <option value="">Unassigned</option>{state.owners.map(o => <option key={o.id} value={o.id} disabled={!o.active && o.id !== item.ownerUserId}>{o.label}{!o.active ? ' · Inactive' : ''}</option>)}
        </select><small>Accountability does not grant signing, spending or approval authority.</small></label>
        <label>Due date {item.dueTrigger.trim() ? optional : required}<input type="date" value={item.dueDate} onChange={e => change(item.id, { dueDate: e.target.value })} /><small>Use the sourced calendar deadline, or specify an actionable trigger below. Past dates remain visible for follow-up.</small></label>
        <label>Due trigger {item.dueDate ? optional : required}<textarea maxLength={500} value={item.dueTrigger} placeholder="Example: Before the first excavation begins" onChange={e => change(item.id, { dueTrigger: e.target.value })} /></label>
        {(item.dueDate && item.dueTrigger.trim() || item.dueRelationship) && <label>Deadline and trigger relationship {item.dueDate && item.dueTrigger.trim() ? required : optional}<textarea maxLength={500} value={item.dueRelationship} placeholder="Example: Before excavation, and no later than the stated date" onChange={e => change(item.id, { dueRelationship: e.target.value })} /><small>Explain how both constraints apply; neither silently replaces the other.</small></label>}
        {!state.items.some(saved => saved.id === item.id) && <button onClick={() => { if (window.confirm('Discard this unsaved obligation?')) { setItems(rows => rows.filter(r => r.id !== item.id)); setDirty(true); } }}>Discard unsaved obligation</button>}
      </fieldset>
      <small>Obligation ID: {item.id} · Satisfaction unverified</small>
    </article>)}
    <button disabled={locked || items.length >= 100} onClick={() => { setItems(rows => [...rows, { id: createRequestId(), type: '', requirement: '', sourceRevisionId: '', ownerUserId: '', dueDate: '', dueTrigger: '', dueRelationship: '' }]); setDirty(true); setMessage(''); }}>Add obligation</button>
    {error && <p role="alert">{error}</p>}
    <p role="status" aria-label="Obligation save status">{message || `Saved obligation plan version ${state.version}`}{dirty ? ' · Unsaved changes' : ''}</p>
    <aside aria-label="Obligation planning gaps"><strong>Saved planning requirements</strong>{state.planningGaps.length ? <ul>{state.planningGaps.map(gap => <li key={gap}>{gap}</li>)}</ul> : <p>Planning fields recorded. Applicability, issuance and satisfaction remain unverified.</p>}</aside>
    <div className="setup-actions"><button disabled={!state.canEdit || busy} onClick={() => void save()}>{busy ? 'Saving…' : pending.current ? 'Retry obligation save' : 'Save obligation plan'}</button><button disabled={busy} onClick={() => void reload()}>Reload saved plan</button></div>
    <h4>Existing gate conditions</h4><p>These are frozen decision records, not editable plan entries or evidence of current discharge. Upstream authorization conditions remain in 5.1 Authorized Basis; do not re-enter them.</p>
    {state.gateConditions.length ? state.gateConditions.map(g => <article key={g.decisionId}><strong>Gate decision {g.decisionId}</strong>{g.obligations.map(o => <div key={o.requirement}><p>{o.description}</p><p>Owner: {o.ownerUserId} · Due: {o.dueDate || o.dueTrigger}</p><p>Limits: {o.permittedLimits} · Consequence: {o.consequence}</p></div>)}</article>) : <p>No Gate 01 conditions recorded.</p>}
    <h4>Saved plan history</h4>
    {state.history.map(h => <details key={h.version}><summary>Plan version {h.version} · {new Date(h.createdAt).toLocaleString()}</summary>
      {h.items.map(item => <div key={item.id}><strong>{item.requirement || 'Unfinished obligation'}</strong><p>{item.type || 'Unassessed'} · Owner: {h.references.owners.find(o => o.id === item.ownerUserId)?.label || 'Unassigned'}</p><p>Due: {item.dueDate || 'No calendar date'} · {item.dueTrigger || 'No event trigger'}</p>{item.dueRelationship && <p>{item.dueRelationship}</p>}</div>)}
      {h.references.revisions.map(source => <PublishedDocumentView key={source.id} revision={{ documentId: source.documentId, revisionId: source.id, revisionNumber: source.revisionNumber, state: 'published', title: source.title, documentType: source.documentType, category: source.category, packageKey: '', data: source.payload, snapshotAvailable: true, publishedAt: source.publishedAt, publishedBy: source.publishedBy, createdAt: '', changeNote: null, changes: [] }} />)}
    </details>)}
  </section>;
}
