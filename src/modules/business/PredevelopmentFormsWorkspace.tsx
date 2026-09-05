import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  createProjectStateDocumentDraft,
  listProjectStateDocumentDrafts,
  updateProjectStateDocumentDraft,
  type ProjectStateDocumentDraft,
} from '../../infrastructure/documents/supabaseDocumentRepository';

type SiteFormData = {
  siteIdentity: string;
  siteControl: string;
  planningStatus: string;
  approvalStatus: string;
  constraints: string[];
  servicing: string[];
  accessStatus: string;
  dueDiligence: string[];
  overallReadiness: number;
  notes: string;
};

const emptySiteForm: SiteFormData = {
  siteIdentity: '', siteControl: '', planningStatus: '', approvalStatus: '', constraints: [],
  servicing: [], accessStatus: '', dueDiligence: [], overallReadiness: 3, notes: '',
};
const asText = (value: unknown) => typeof value === 'string' ? value : '';
const asList = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const toSiteForm = (data: Record<string, unknown>): SiteFormData => ({
  siteIdentity: asText(data.siteIdentity),
  siteControl: asText(data.siteControl || data.ownershipControl),
  planningStatus: asText(data.planningStatus),
  approvalStatus: asText(data.approvalStatus || data.approvals),
  constraints: asList(data.constraints),
  servicing: asList(data.servicing),
  accessStatus: asText(data.accessStatus),
  dueDiligence: asList(data.dueDiligence),
  overallReadiness: typeof data.overallReadiness === 'number' ? data.overallReadiness : 3,
  notes: asText(data.notes || data.openItems),
});
function errorText(error: unknown) { return error instanceof Error ? error.message : 'The form could not be saved.'; }

const controlOptions = ['Owned', 'Under contract', 'Option / conditional control', 'Client controlled', 'No control', 'Unknown'];
const planningOptions = ['Conforming / permitted', 'Minor approvals needed', 'Rezoning / major planning needed', 'Planning review underway', 'Unknown'];
const approvalOptions = ['Not assessed', 'Requirements identified', 'Applications underway', 'Key approvals received', 'Complete'];
const constraintOptions = ['Environmental', 'Flood / drainage', 'Grading / topography', 'Geotechnical', 'Heritage', 'Easements', 'Neighbour / adjacency', 'None identified'];
const servicingOptions = ['Water', 'Sanitary', 'Storm', 'Hydro', 'Gas', 'Telecom'];
const dueDiligenceOptions = ['Survey', 'Title', 'Environmental', 'Geotechnical', 'Planning review', 'Servicing review', 'Cost review', 'Schedule review'];

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

  const choose = (key: 'siteControl' | 'planningStatus' | 'approvalStatus' | 'accessStatus', options: string[]) =>
    <div className="choice-grid">{options.map((option) => <button key={option} type="button" className={values[key] === option ? 'choice-button selected' : 'choice-button'} disabled={disabled || saving} onClick={() => setValues((current) => ({ ...current, [key]: option }))}>{option}</button>)}</div>;
  const checks = (key: 'constraints' | 'servicing' | 'dueDiligence', options: string[]) => <div className="check-grid">{options.map((option) => <label key={option} className="check-option"><input type="checkbox" checked={values[key].includes(option)} disabled={disabled || saving} onChange={() => setValues((current) => ({ ...current, [key]: current[key].includes(option) ? current[key].filter((item) => item !== option) : [...current[key], option] }))} />{option}</label>)}</div>;

  if (loading) return <section className="panel"><h3>Predevelopment forms</h3><p>Loading forms…</p></section>;
  return <section className="panel"><p className="eyebrow">Predevelopment evidence</p><h3>Development & Site Review</h3><p>Structured review. Select answers first; type only where project-specific detail is necessary.</p><form className="structured-form" onSubmit={save}>
    <fieldset><legend>Site</legend><label>Site identity / address<input value={values.siteIdentity} disabled={disabled || saving} onChange={(event) => setValues((current) => ({ ...current, siteIdentity: event.target.value }))} placeholder="Address or site name" /></label></fieldset>
    <fieldset><legend>Site control</legend>{choose('siteControl', controlOptions)}</fieldset>
    <fieldset><legend>Planning / zoning</legend>{choose('planningStatus', planningOptions)}</fieldset>
    <fieldset><legend>Approvals</legend>{choose('approvalStatus', approvalOptions)}</fieldset>
    <fieldset><legend>Known constraints</legend>{checks('constraints', constraintOptions)}</fieldset>
    <fieldset><legend>Servicing reviewed / available</legend>{checks('servicing', servicingOptions)}</fieldset>
    <fieldset><legend>Site access</legend>{choose('accessStatus', ['Suitable', 'Manageable constraints', 'Major constraint', 'Not assessed'])}</fieldset>
    <fieldset><legend>Due diligence completed</legend>{checks('dueDiligence', dueDiligenceOptions)}</fieldset>
    <fieldset><legend>Overall development readiness</legend><div className="scale-row">{[1,2,3,4,5].map((score) => <button key={score} type="button" className={values.overallReadiness === score ? 'scale-button selected' : 'scale-button'} disabled={disabled || saving} onClick={() => setValues((current) => ({ ...current, overallReadiness: score }))}>{score}<small>{score === 1 ? 'Very low' : score === 5 ? 'Very high' : ''}</small></button>)}</div></fieldset>
    <fieldset><legend>Exceptions / blockers / project-specific notes</legend><textarea rows={3} value={values.notes} disabled={disabled || saving} onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))} placeholder="Only add detail that cannot be captured above." /></fieldset>
    <div className="form-actions"><button type="submit" disabled={disabled || saving}>{saving ? 'Saving…' : siteDraft ? 'Save draft' : 'Create draft'}</button></div>
  </form>{feedback ? <p className="success-message">{feedback}</p> : null}{error ? <p className="error-message">{error}</p> : null}</section>;
}
