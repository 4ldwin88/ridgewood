import { supabase } from '../auth/supabaseClient';
import type { SetupEvidence, SetupRequirementKey } from '../../domain/project-state/setupGate';

export interface SetupState {
  projectStateId: string;
  version: number;
  savedVersion?: number;
  authorizationRecordId: string | null;
  evidence: SetupEvidence[];
  unmet: SetupRequirementKey[];
  canEdit: boolean;
  stage: string;
  approvalBlocker: string;
  history: { version: number; actorUserId: string; createdAt: string }[];
}
export const setupRepository = {
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
