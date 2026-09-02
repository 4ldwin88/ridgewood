import type { Opportunity, OpportunityPriority } from '../../domain/opportunity/opportunity';
import { supabase } from '../auth/supabaseClient';

// Transitional UI adapter: the Business UI still calls this an Opportunity while
// Opportunity is now only the initial stage of the authoritative Project State.
function fromProjectState(row: any): Opportunity {
  return {
    id: row.id,
    name: row.name,
    lifecycleState: row.state,
    commercialStage: row.commercial_stage ?? undefined,
    commercialProbability: row.commercial_probability ?? undefined,
    priority: row.priority as OpportunityPriority | undefined,
    ownerUserId: row.owner_user_id,
    organizationId: row.organization_id ?? undefined,
    location: row.site_location ?? undefined,
    sector: row.sector ?? undefined,
    source: row.source_context ?? undefined,
    summary: row.summary ?? undefined,
    nextAction: row.next_action ?? undefined,
    projectStateId: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as Opportunity;
}

async function userAndWorkspace() {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw authError ?? new Error('Authentication required.');
  const { data: membership, error: membershipError } = await supabase.from('workspace_memberships').select('workspace_id').eq('user_id', authData.user.id).eq('status', 'active').limit(1).single();
  if (membershipError || !membership) throw membershipError ?? new Error('No active Ridgewood workspace is available for this account.');
  return { userId: authData.user.id, workspaceId: membership.workspace_id as string };
}

export const supabaseOpportunityRepository = {
  async list(): Promise<Opportunity[]> {
    const { workspaceId } = await userAndWorkspace();
    const { data, error } = await supabase.from('project_states').select('*').eq('workspace_id', workspaceId).is('archived_at', null).order('updated_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(fromProjectState);
  },

  async create(opportunity: Opportunity): Promise<Opportunity> {
    await userAndWorkspace();
    const { data, error } = await supabase.rpc('create_project_state', {
      project_state_input: {
        id: opportunity.projectStateId ?? opportunity.id,
        name: opportunity.name,
        state: opportunity.lifecycleState,
        commercial_stage: opportunity.commercialStage ?? null,
        commercial_probability: opportunity.commercialProbability ?? null,
        priority: opportunity.priority ?? null,
        organization_id: opportunity.organizationId ?? null,
        site_location: opportunity.location ?? null,
        sector: opportunity.sector ?? null,
        source_context: opportunity.source ?? null,
        summary: opportunity.summary ?? null,
        next_action: opportunity.nextAction ?? null,
      },
    });
    if (error) throw error;
    return fromProjectState(data);
  },

  async archive(id: string): Promise<void> {
    const { userId, workspaceId } = await userAndWorkspace();
    const { error } = await supabase.from('project_states').update({ archived_at: new Date().toISOString(), archived_by: userId, updated_at: new Date().toISOString() }).eq('id', id).eq('workspace_id', workspaceId);
    if (error) throw error;
  },
};
