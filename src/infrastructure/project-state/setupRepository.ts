import { supabase } from '../auth/supabaseClient';
import type { ConditionalObligation, GateDisposition, SetupEvidence, SetupRequirementKey } from '../../domain/project-state/setupGate';

export interface SetupState {
  projectStateId: string;
  version: number;
  contractPreparationVersion?: number;
  scopePreparationVersion?: number;
  savedVersion?: number;
  authorizationRecordId: string | null;
  evidence: SetupEvidence[];
  unmet: SetupRequirementKey[];
  canEdit: boolean;
  stage: string;
  approvalBlocker: string;
  canDecide: boolean;
  authorities: { id: string; basis: string; reference: string; permitsConditionalGo: boolean; conditionalRequirements: SetupRequirementKey[] }[];
  decisions: { id: string; disposition: GateDisposition; rationale: string; actorUserId: string; createdAt: string; obligations: ConditionalObligation[]; setupVersion: number; authorityReference: string; evidence: SetupEvidence[] }[];
  history: { version: number; actorUserId: string; createdAt: string }[];
}
export const setupRepository = {
  async decide(projectStateId: string, version: number, requestId: string, authorityId: string, disposition: GateDisposition, rationale: string, obligations: ConditionalObligation[]): Promise<void> {
    const { error } = await supabase.rpc('decide_project_gate01', { project_state_input: projectStateId, version_input: version, request_id_input: requestId, authority_id_input: authorityId, disposition_input: disposition, rationale_input: rationale, obligations_input: obligations });
    if (error) throw new Error(error.message);
  },
  async read(projectStateId: string): Promise<SetupState> {
    const { data, error } = await supabase.rpc('read_project_setup', { project_state_input: projectStateId });
    if (error) throw new Error(error.message);
    return data as SetupState;
  },
  async save(projectStateId: string, version: number, requestId: string, evidence: SetupEvidence[]): Promise<SetupState> {
    const { data, error } = await supabase.rpc('save_project_setup', {
      project_state_input: projectStateId, expected_version_input: version,
      request_id_input: requestId, evidence_input: evidence,
    });
    if (error) throw new Error(error.message);
    return data as SetupState;
  },
};
