import { useMemo, useState } from 'react';
import {
  supabaseQualificationRepository,
  type QualificationArea,
  type QualificationAssessment,
  type QualificationDecision,
  type QualificationFinding,
} from '../../infrastructure/qualification/supabaseQualificationRepository';

const areas: [QualificationArea, string, string][] = [
  ['opportunity_credibility', 'Opportunity credibility', 'Is the opportunity sufficiently real and worth Ridgewood attention?'],
  ['strategic_fit', 'Ridgewood role & strategic fit', 'Does the work fit Ridgewood’s intended role and capabilities?'],
  ['relationship_authority', 'Relationship & authority', 'Are client, partners, decision-makers and the authority path understood?'],
  ['commercial_plausibility', 'Commercial plausibility', 'Is there a credible commercial path worth developing?'],
  ['execution_risk', 'Execution & risk plausibility', 'Can Ridgewood plausibly deliver given known constraints and capacity?'],
];

function errorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function QualificationReviewWorkspace({
  projectStateId,
  findings,
  currentStage,
  preauthorization,
  onFindingsChanged,
  onDecision,
  onDownstreamReassessment,
}: {
  projectStateId: string;
  findings: QualificationFinding[];
  currentStage: string;
  preauthorization: boolean;
  onFindingsChanged: (findings: QualificationFinding[]) => void;
  onDecision: (decision: QualificationDecision, rationale?: string) => Promise<void>;
  onDownstreamReassessment?: () => Promise<void>;
}) {
  const [notes, setNotes] = useState<Record<string, string>>(() => Object.fromEntries(findings.map(f => [f.area, f.note ?? ''])));
  const [rationale, setRationale] = useState('');
  const [action, setAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const findingMap = useMemo(() => new Map(findings.map(f => [f.area, f])), [findings]);
  const complete = areas.every(([area]) => findingMap.has(area));
  const unresolved = areas.filter(([area]) => !findingMap.has(area));

  async function save(area: QualificationArea, assessment: QualificationAssessment) {
    setAction(`qualification:${area}`);
    setError(null);
    setFeedback(null);
    try {
      const saved = await supabaseQualificationRepository.save(projectStateId, {
        area,
        assessment,
        note: notes[area]?.trim() || undefined,
      });
      onFindingsChanged([...findings.filter(f => f.area !== area), saved]);
      if (currentStage === 'predevelopment' || currentStage === 'authorization') {
        await onDownstreamReassessment?.();
        setFeedback('Qualification updated. Downstream readiness was reopened for reassessment.');
      } else {
        setFeedback('Qualification finding saved.');
      }
    } catch (e) {
      setError(errorText(e, 'Qualification finding could not be saved.'));
    } finally {
      setAction(null);
    }
  }

  async function decide(decision: QualificationDecision) {
    setAction(`decision:${decision}`);
    setError(null);
    try {
      await onDecision(decision, rationale.trim() || undefined);
    } catch (e) {
      setError(errorText(e, 'Qualification decision failed.'));
    } finally {
      setAction(null);
    }
  }

  return <section className="qualification-review" aria-label="Qualification review">
    <div className="document-context">
      <strong>Qualification Review</strong>
      <span className="status-pill">{complete ? 'Complete' : findings.length ? 'In progress' : 'Not started'}</span>
      <small>All five qualification areas are required before Ridgewood can continue to Predevelopment. “Unclear” is a valid governed finding and keeps uncertainty explicit.</small>
    </div>

    {error ? <p className="error-message">{error}</p> : null}
    {feedback ? <p className="guidance success">{feedback}</p> : null}

    <div className="qualification-area-list">
      {areas.map(([area, label, help]) => {
        const finding = findingMap.get(area);
        return <fieldset className="qualification-area" key={area}>
          <legend>{label} <span className="required-marker">Required</span></legend>
          <small>{help}</small>
          <div className="choice-row" role="group" aria-label={`${label} assessment`}>
            {(['yes', 'unclear', 'no'] as QualificationAssessment[]).map(value => {
              const selected = finding?.assessment === value;
              return <button
                type="button"
                key={value}
                aria-pressed={selected}
                className={selected ? 'choice-button selected' : 'choice-button'}
                disabled={!preauthorization || Boolean(action)}
                onClick={() => void save(area, value)}
              >{selected ? '✓ ' : ''}{value === 'yes' ? 'Yes' : value === 'unclear' ? 'Unclear' : 'No'}</button>;
            })}
          </div>
          <label>Evidence / note <span className="optional-marker">Optional</span>
            <textarea
              rows={2}
              value={notes[area] ?? ''}
              disabled={!preauthorization || Boolean(action)}
              onChange={e => setNotes(v => ({ ...v, [area]: e.target.value }))}
              placeholder="Record the basis, evidence, dependency or material unknown."
            />
          </label>
          {finding ? <small className="saved-indicator">✓ Saved finding: {finding.assessment}</small> : <small>Not started</small>}
        </fieldset>;
      })}
    </div>

    {!complete ? <div className="blocking-summary"><strong>Qualification incomplete</strong><p>{unresolved.length} required area(s) still need a governed finding.</p></div> : null}

    {currentStage === 'qualification' ? <div className="qualification-decision">
      <label>Decision rationale <span className="required-marker">Required for Hold or Decline</span>
        <textarea rows={3} value={rationale} onChange={e => setRationale(e.target.value)} placeholder="Summarize the basis for the stage decision." />
      </label>
      <div className="form-actions">
        <button disabled={!complete || Boolean(action)} onClick={() => void decide('advance')}>Continue to Predevelopment</button>
        <button className="secondary" disabled={Boolean(action) || !rationale.trim()} onClick={() => void decide('hold')}>Hold</button>
        <button className="secondary danger" disabled={Boolean(action) || !rationale.trim()} onClick={() => void decide('decline')}>Decline</button>
      </div>
    </div> : preauthorization ? <p className="guidance">Qualification remains revisable until Project Authorization. Material changes reopen downstream readiness for reassessment.</p> : null}
  </section>;
}