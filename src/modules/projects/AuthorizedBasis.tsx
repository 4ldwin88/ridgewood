import { useEffect, useState } from 'react';
import { supabaseProjectStateRepository as repository, type AuthorizationRecordSummary, type AuthorizationAmendmentSummary } from '../../infrastructure/project-state/supabaseProjectStateRepository';
import type { ProjectStateDocumentRevision } from '../../infrastructure/documents/supabaseDocumentRepository';
import { PublishedDocumentView } from '../business/PublishedDocumentView';
import { WorkspaceModal } from '../business/WorkspaceModal';

const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown) => value == null || value === '' ? 'Not recorded' : String(value);
function SnapshotValue({ value }: { value: unknown }) {
  if (Array.isArray(value)) return value.length ? <ul>{value.map((v, i) => <li key={i}><SnapshotValue value={v} /></li>)}</ul> : <p>None recorded in the frozen snapshot.</p>;
  if (value && typeof value === 'object') return <dl>{Object.entries(object(value)).map(([key, v]) => <div key={key}><dt>{key.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ')}</dt><dd><SnapshotValue value={v} /></dd></div>)}</dl>;
  return <span>{text(value)}</span>;
}
function FrozenDocument({ value }: { value: unknown }) {
  const d = object(value);
  const revision: ProjectStateDocumentRevision = {
    documentId: text(d.documentRecordId), revisionId: text(d.revisionId), revisionNumber: Number(d.revisionNumber) || 0,
    state: 'published', title: text(d.title), documentType: text(d.documentType), category: text(d.categoryKey), packageKey: '',
    data: object(d.sourceSnapshot), snapshotAvailable: d.sourceSnapshot != null && typeof d.sourceSnapshot === 'object' && !Array.isArray(d.sourceSnapshot),
    publishedAt: typeof d.publishedAt === 'string' ? d.publishedAt : null, publishedBy: typeof d.publishedBy === 'string' ? d.publishedBy : null,
    createdAt: '', changeNote: null, changes: [],
  };
  return <details className="setup-section"><summary>{revision.title} · Frozen revision {revision.revisionNumber}</summary><PublishedDocumentView revision={revision} /></details>;
}

export function AuthorizedBasis({ projectStateId, authorizationRecordId }: { projectStateId: string; authorizationRecordId?: string }) {
  const [open, setOpen] = useState(false);
  return <div className="authorization-handoff"><button className="secondary-button" onClick={() => setOpen(true)}>5.1 Authorized Basis</button>{open && <WorkspaceModal title="5.1 Authorized Basis" onClose={() => setOpen(false)}><BasisContent key={`${projectStateId}:${authorizationRecordId ?? ''}`} projectStateId={projectStateId} authorizationRecordId={authorizationRecordId} /></WorkspaceModal>}</div>;
}
function BasisContent({ projectStateId, authorizationRecordId }: { projectStateId: string; authorizationRecordId?: string }) {
  const [record, setRecord] = useState<AuthorizationRecordSummary | null>(null);
  const [amendments, setAmendments] = useState<AuthorizationAmendmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    Promise.all([repository.authorizationRecord(projectStateId, authorizationRecordId), repository.authorizationAmendments(projectStateId)])
      .then(([basis, history]) => { if (active) { setRecord(basis); setAmendments(history.filter(a => a.authorizationRecordId === basis?.id)); } })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : 'Authorized basis could not load.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [projectStateId, authorizationRecordId, attempt]);
  if (loading) return <p role="status">Loading authorized basis…</p>;
  if (error) return <div><p role="alert">{error}</p><button onClick={() => { setLoading(true); setError(''); setAttempt(n => n + 1); }}>Retry loading basis</button></div>;
  if (!record) return <p role="alert">No frozen authorization record is available for this project. Recover the governed authorization before relying on Setup readiness.</p>;
  const snapshot = object(record.evidenceSnapshot);
  return <section className="stage-tool-surface authorized-basis">
    <h4>5.1.1 Frozen mandate</h4>
    <p>This is the basis recorded at authorization. Review it here without re-entering it in Setup. Later publications and amendments do not replace this snapshot.</p>
    <dl><div><dt>Project State</dt><dd>{projectStateId}</dd></div><div><dt>Authorization record</dt><dd>{record.id}</dd></div><div><dt>Outcome</dt><dd>{record.outcome}</dd></div><div><dt>Authorized at</dt><dd>{new Date(record.createdAt).toLocaleString()}</dd></div><div><dt>Authority basis</dt><dd>{record.authorityBasis || 'Not recorded — do not infer delegated authority'}</dd></div></dl>
    <h4>Authorized limits and conditions</h4>
    <p>These are historical conditions, not a current completion assessment. Their live obligation tracking is not yet connected in this view.</p>
    <SnapshotValue value={snapshot.authorizationConditions} />
    <h4>Frozen published documents</h4>
    {Array.isArray(snapshot.publishedDocuments) ? snapshot.publishedDocuments.length ? snapshot.publishedDocuments.map((d, i) => <FrozenDocument key={i} value={d} />) : <p>No published documents were captured.</p> : <p role="alert">Published-document evidence was not captured in this historical record.</p>}
    {(['evidenceReferences', 'decisions', 'verificationEvidence'] as const).map(key => <details className="setup-section" key={key}><summary>{({ evidenceReferences: 'Evidence references', decisions: 'Decisions and approvals', verificationEvidence: 'Authorization verification evidence' })[key]}</summary><SnapshotValue value={snapshot[key]} /></details>)}
    <details className="setup-section"><summary>Readiness at authorization</summary><SnapshotValue value={record.readinessSnapshot} /></details>
    <h4>Corrections and addenda</h4><p>Recorded amendments are shown separately. This viewer cannot grant approval or change the frozen mandate.</p>
    {amendments.length ? amendments.map(a => <article className="setup-section" key={a.id}><strong>{a.amendmentType} · {new Date(a.createdAt).toLocaleString()}</strong><p>{a.summary}</p><p>{a.rationale}</p><SnapshotValue value={{ authorityBasis: a.authorityBasis, documentRecordId: a.documentRecordId, originalRevisionId: a.originalRevisionId, changedFields: a.changedFields }} /></article>) : <p>No amendments recorded for this authorization.</p>}
  </section>;
}
