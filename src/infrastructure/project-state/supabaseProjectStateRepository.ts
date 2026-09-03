import type { CommercialStage, ProjectPriority, ProjectStage, ProjectState, ProjectStateStatus } from '../../domain/project-state/projectState';
import { supabase } from '../auth/supabaseClient';

export type StageRequirementStatus = 'not_started' | 'in_progress' | 'satisfied' | 'blocked' | 'unknown';
export interface ProjectStateStageRequirement { requirementKey: string; label: string; status: StageRequirementStatus; required: boolean; notes?: string }
export interface OpportunityBasicsInput { name: string; location?: string; sector?: string; source?: string; summary?: string; nextAction?: string }

type ProjectStateRow = {
  id: string; name: string; stage: ProjectStage | null; status: ProjectStateStatus | null;
  commercial_stage: CommercialStage | null; commercial_probability: number | null; priority: ProjectPriority | null;
  owner_user_id: string | null; organization_id: string | null; site_location: string | null; sector: string | null;
  source_context: string | null; summary: string | null; next_action: string | null; created_at: string; updated_at: string;
};
type RequirementRow = { requirement_key: string; label: string; status: StageRequirementStatus; required: boolean; notes: string | null };

function fromRow(row: ProjectStateRow): ProjectState {
  return {
    id: row.id, name: row.name, stage: row.stage ?? 'opportunity', status: row.status ?? 'active',
    commercialStage: row.commercial_stage ?? 'unknown', probability: row.commercial_probability ?? undefined,
    priority: row.priority ?? 'medium', ownerPersonId: row.owner_user_id ?? undefined,
    organizationId: row.organization_id ?? undefined, location: row.site_location ?? undefined,
    sector: row.sector ?? undefined, source: row.source_context ?? undefined, summary: row.summary ?? undefined,
    nextAction: row.next_action ?? undefined, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}
function requirementFromRow(row: RequirementRow): ProjectStateStageRequirement {
  return { requirementKey: row.requirement_key, label: row.label, status: row.status, required: row.required, notes: row.notes ?? undefined };
}
async function context() {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw authError ?? new Error('Authentication required.');
  const { data: membership, error: membershipError } = await supabase.from('workspace_memberships').select('workspace_id').eq('user_id', authData.user.id).eq('status', 'active').limit(1).single();
  if (membershipError || !membership) throw membershipError ?? new Error('No active Ridgewood workspace is available for this account.');
  return { userId: authData.user.id, workspaceId: membership.workspace_id as string };
}
export const supabaseProjectStateRepository = {
  async list(): Promise<ProjectState[]> {
    const { workspaceId } = await context();
    const { data, error } = await supabase.from('project_states').select('*').eq('workspace_id', workspaceId).is('archived_at', null).order('updated_at', { ascending: false });
    if (error) throw error;
    return ((data ?? []) as ProjectStateRow[]).map(fromRow);
  },
  async create(input: Omit<ProjectState, 'id' | 'stage' | 'status' | 'createdAt' | 'updatedAt'>): Promise<ProjectState> {
    await context();
    const { data, error } = await supabase.rpc('create_project_state', { project_state_input: { name: input.name, commercial_stage: input.commercialStage, commercial_probability: input.probability ?? null, priority: input.priority, organization_id: input.organizationId ?? null, site_location: input.location ?? null, sector: input.sector ?? null, source_context: input.source ?? null, summary: input.summary ?? null, next_action: input.nextAction ?? null } });
    if (error) throw error;
    return fromRow(data as ProjectStateRow);
  },
  async updateOpportunityBasics(id: string, input: OpportunityBasicsInput): Promise<ProjectState> {
    await context();
    const { data, error } = await supabase.rpc('update_project_state_opportunity_basics', { project_state_input: id, basics_input: { name: input.name, site_location: input.location ?? null, sector: input.sector ?? null, source_context: input.source ?? null, summary: input.summary ?? null, next_action: input.nextAction ?? null } });
    if (error) throw error;
    return fromRow(data as ProjectStateRow);
  },
  async opportunityRequirements(id: string): Promise<ProjectStateStageRequirement[]> {
    await context();
    const { data, error } = await supabase.rpc('refresh_project_state_opportunity_requirements', { project_state_input: id });
    if (error) throw error;
    return ((data ?? []) as RequirementRow[]).map(requirementFromRow);
  },
  async advanceToQualification(id: string): Promise<ProjectState> {
    await context();
    const { data, error } = await supabase.rpc('advance_project_state_to_qualification', { project_state_input: id });
    if (error) throw error;
    return fromRow(data as ProjectStateRow);
  },
  async enterAuthorization(id: string): Promise<ProjectState> {
    await context();
    const { data, error } = await supabase.rpc('enter_project_state_authorization', { project_state_input: id });
    if (error) throw error;
    return fromRow(data as ProjectStateRow);
  },
  async archive(id: string): Promise<void> {
    await context();
    const { error } = await supabase.rpc('archive_project_state', { project_state_input: id });
    if (error) throw error;
  },
};
