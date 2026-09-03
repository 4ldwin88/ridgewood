import type { ProjectPriority, ProjectStage, ProjectState, ProjectStateStatus } from '../../domain/project-state/projectState';
import { supabase } from '../auth/supabaseClient';

function fromRow(row: any): ProjectState {
  return {
    id: row.id,
    name: row.name,
    stage: (row.stage ?? 'opportunity') as ProjectStage,
    status: (row.status ?? 'active') as ProjectStateStatus,
    commercialStage: row.commercial_stage ?? 'unknown',
    probability: row.commercial_probability ?? undefined,
    priority: (row.priority ?? 'medium') as ProjectPriority,
    ownerPersonId: row.owner_user_id ?? undefined,
    organizationId: row.organization_id ?? undefined,
    location: row.site_location ?? undefined,
    sector: row.sector ?? undefined,
    source: row.source_context ?? undefined,
    summary: row.summary ?? undefined,
    nextAction: row.next_action ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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
    return (data ?? []).map(fromRow);
  },

  async create(input: Omit<ProjectState, 'id' | 'stage' | 'status' | 'createdAt' | 'updatedAt'>): Promise<ProjectState> {
    await context();
    const { data, error } = await supabase.rpc('create_project_state', { project_state_input: {
      name: input.name,
      commercial_stage: input.commercialStage,
      commercial_probability: input.probability ?? null,
      priority: input.priority,
      organization_id: input.organizationId ?? null,
      site_location: input.location ?? null,
      sector: input.sector ?? null,
      source_context: input.source ?? null,
      summary: input.summary ?? null,
      next_action: input.nextAction ?? null,
    }});
    if (error) throw error;
    return fromRow(data);
  },

  async archive(id: string): Promise<void> {
    const { userId, workspaceId } = await context();
    const { error } = await supabase.from('project_states').update({ archived_at: new Date().toISOString(), archived_by: userId, updated_at: new Date().toISOString() }).eq('id', id).eq('workspace_id', workspaceId);
    if (error) throw error;
  },
};
