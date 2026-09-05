import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  createProjectStateDocumentDraft,
  listProjectStateDocumentDrafts,
  updateProjectStateDocumentDraft,
  type ProjectStateDocumentDraft,
} from '../../infrastructure/documents/supabaseDocumentRepository';

type SiteFormData = {
  siteIdentity: string;
  ownershipControl: string;
  planningStatus: string;
  approvals: string;
  physicalConstraints: string;
  servicingAccess: string;
  dueDiligence: string;
  openItems: string;
};

const emptySiteForm: SiteFormData = {
  siteIdentity: '', ownershipControl: '', planningStatus: '', approvals: '',
  physicalConstraints: '', servicingAccess: '', dueDiligence: '', openItems: '',
};
const asText = (value: unknown) => typeof value === 'string' ? value : '';
const toSiteForm = (data: Record<string, unknown>): SiteFormData => ({
  siteIdentity: asText(data.siteIdentity), ownershipControl: asText(data.ownershipControl),
  planningStatus: asText(data.planningStatus), approvals: asText(data.approvals),
  physicalConstraints: asText(data.physicalConstraints), servicingAccess: asText(data.servicingAccess),
  dueDiligence: asText(data.dueDiligence), openItems: asText(data.openItems),
});
function errorText(error: unknown) { return error instanceof Error ? error.message : 'The form could not be saved.'; }

export function PredevelopmentFormsWorkspace({ projectStateId, disabled = false }: { projectStateId: string; disabled?: boolean }) {
  const [drafts, setDrafts] = useState<ProjectStateDocumentDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [values, setValues] = useState<SiteFormData>(emptySiteForm);
  const siteDraft = useMemo(() => drafts.find((draft) => draft.documentType === 'predevelopment_development_site'), [drafts]);

  async function reload() {
    const next = await listProjectStateDocumentDrafts(projectStateId);
    setDrafts(next);
    const draft = next.find((candidate) => candidate.documentType === 'predevelopment_development_site');
    setValues(draft ? toSiteForm(draft.data) : emptySiteForm);
  }
  useEffect(() => { let active = true; setLoading(true); listProjectStateDocumentDrafts(projectStateId).then((next) => {
    if (!active) return; setDrafts(next); const draft = next.find((candidate) => candidate.documentType === 'predevelopment_development_site'); setValues(draft ? toSiteForm(draft.data) : emptySiteForm); setLoading(false);
  }).catch((caught) => { if (active) { setError(errorText(caught)); setLoading(false); } }); return () => { active = false; }; }, [projectStateId]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (disabled || saving) return; setSaving(true); setError(null); setFeedback(null);
    try {
      if (siteDraft) await updateProjectStateDocumentDraft(siteDraft.revisionId, values);
      else await createProjectStateDocumentDraft(projectStateId, { packageKey: 'predevelopment', category: 'development_site', documentType: 'predevelopment_development_site', title: 'Development & Site Review', initialData: values });
      await reload(); setFeedback('Development & Site draft persisted and reloaded.');
    } catch (caught) { setError(errorText(caught)); } finally { setSaving(false); }
  }
  const field = (key: keyof SiteFormData, label: string, rows = 3) => <label>{label}<textarea rows={rows} value={values[key]} disabled={disabled || saving} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))} /></label>;
  if (loading) return <section className="panel"><h3>Predevelopment forms</h3><p>Loading forms…</p></section>;
  return <section className="panel"><p className="eyebrow">Predevelopment evidence</p><h3>Development & Site Review</h3><p>Working draft for site, planning, approvals and development constraints. Saving verifies persistence by reloading the stored draft.</p><form className="opportunity-form" onSubmit={save}>
    {field('siteIdentity', 'Site identity / address')}{field('ownershipControl', 'Ownership / site control')}{field('planningStatus', 'Planning / zoning status')}{field('approvals', 'Approvals required / status')}{field('physicalConstraints', 'Physical / environmental constraints')}{field('servicingAccess', 'Servicing, utilities & access')}{field('dueDiligence', 'Due diligence completed / evidence')}{field('openItems', 'Open items / decisions / blockers', 4)}
    <div className="wide form-actions"><button type="submit" disabled={disabled || saving}>{saving ? 'Saving…' : siteDraft ? 'Save draft' : 'Create draft'}</button></div>
  </form>{feedback ? <p className="success-message">{feedback}</p> : null}{error ? <p className="error-message">{error}</p> : null}</section>;
}
