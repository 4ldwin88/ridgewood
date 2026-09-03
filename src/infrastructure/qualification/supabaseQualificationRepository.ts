import { supabase } from '../auth/supabaseClient';

export const QUALIFICATION_AREAS = [
  'opportunity_credibility',
  'strategic_fit',
  'relationship_authority',
  'commercial_plausibility',
  'execution_risk',
] as const;

export type QualificationArea = (typeof QUALIFICATION_AREAS)[number];
export type QualificationAssessment = 'yes' | 'unclear' | 'no';
export type QualificationDecision = 'advance' | 'hold' | 'decline';
export type QualificationFinding = { area: QualificationArea; assessment: QualificationAssessment; note?: string };

async function requireAuthentication(): Promise<void> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw error ?? new Error('Authentication required.');
}

export const supabaseQualificationRepository = {
  async list(projectStateId: string): Promise<QualificationFinding[]> {
    await requireAuthentication();
    const { data, error } = await supabase.from('project_state_qualification_findings').select('area,assessment,note').eq('project_state_id', projectStateId);
    if (error) throw error;
    return (data ?? []) as QualificationFinding[];
  },
  async save(projectStateId: string, finding: QualificationFinding): Promise<void> {
    await requireAuthentication();
    const { error } = await supabase.rpc('record_project_state_qualification_finding', {
      project_state_input: projectStateId,
      area_input: finding.area,
      assessment_input: finding.assessment,
      note_input: finding.note ?? null,
    });
    if (error) throw error;
  },
  async decide(projectStateId: string, decision: QualificationDecision, rationale?: string): Promise<void> {
    await requireAuthentication();
    const { error } = await supabase.rpc('set_project_state_qualification_decision', {
      project_state_input: projectStateId,
      decision_input: decision,
      rationale_input: rationale ?? null,
    });
    if (error) throw error;
  },
};
