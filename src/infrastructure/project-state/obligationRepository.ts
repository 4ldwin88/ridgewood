import { supabase } from '../auth/supabaseClient';

export interface ObligationPlanItem {
  id: string;
  type: '' | 'contract' | 'permit' | 'insurance' | 'safety_regulatory' | 'warranty' | 'other';
  requirement: string;
  sourceRevisionId: string;
  ownerUserId: string;
  dueDate: string;
  dueTrigger: string;
  dueRelationship: string;
}
export interface ObligationSource {
  id: string; documentId: string; documentType: string; category: string;
  title: string; revisionNumber: number; publishedAt: string; publishedBy: string;
  payload: Record<string, unknown>;
}
export interface ObligationPlanState {
  projectStateId: string; version: number; savedVersion?: number;
  authorizationRecordId: string | null; canEdit: boolean;
  items: ObligationPlanItem[]; planningGaps: string[];
  planComplete: boolean; satisfactionVerified: boolean;
  owners: { id: string; label: string; active: boolean }[];
  sources: { id: string; label: string; state: string }[];
  history: { version: number; createdAt: string; items: ObligationPlanItem[];
    references: { revisions: ObligationSource[]; owners: { id: string; label: string }[] } }[];
  gateConditions: { decisionId: string; createdAt: string; obligations: {
    requirement: string; description: string; ownerUserId: string; dueDate?: string;
    dueTrigger?: string; permittedLimits: string; consequence: string;
  }[] }[];
}
export class ObligationCommandError extends Error {
  constructor(message: string, public code: string) { super(message); }
}
export const obligationRepository = {
  async read(projectStateId: string): Promise<ObligationPlanState> {
    const { data, error } = await supabase.rpc('read_project_obligation_plan', { project_state_input: projectStateId });
    if (error) throw new ObligationCommandError(error.message, error.code);
    return data;
  },
  async save(projectStateId: string, version: number, id: string, items: ObligationPlanItem[]): Promise<ObligationPlanState> {
    const { data, error } = await supabase.rpc('save_project_obligation_plan', {
      project_state_input: projectStateId, expected_version_input: version,
      request_id_input: id, items_input: items,
    });
    if (error) throw new ObligationCommandError(error.message, error.code);
    return data;
  },
};
