import type { OpportunityRepository } from '../../application/ports/opportunityRepository';
import type { Opportunity } from '../../domain/opportunity/opportunity';
import { supabase } from '../auth/supabaseClient';

function fromRow(row: any): Opportunity {
  return {
    id: row.id,
    name: row.name,
    organizationId: row.organization_id ?? undefined,
    location: row.site_location ?? undefined,
    sector: row.sector ?? undefined,
    source: row.source_context ?? undefined,
    summary: row.summary ?? undefined,
    priority: row.priority,
    lifecycleState: row.lifecycle,
    commercialStage: row.commercial_stage ?? 'unknown',
    probability: row.commercial_probability ?? undefined,
    nextAction: row.next_action ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function userAndWorkspace() {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error('Authentication required.');
  const { data, error } = await supabase.from('workspace_memberships').select('workspace_id').eq('user_id', userData.user.id).eq('status', 'active').limit(1).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('No active Ridgewood workspace membership.');
  return { userId: userData.user.id, workspaceId: data.workspace_id as string };
}

export const supabaseOpportunityRepository: OpportunityRepository = {
  async create(opportunity) {
    const { userId, workspaceId } = await userAndWorkspace();
    const { data, error } = await supabase.from('opportunities').insert({
      id: opportunity.id,
      workspace_id: workspaceId,
      name: opportunity.name,
      lifecycle: opportunity.lifecycleState,
      commercial_stage: opportunity.commercialStage,
      commercial_probability: opportunity.probability,
      priority: opportunity.priority,
      owner_user_id: userId,
      organization_id: opportunity.organizationId,
      site_location: opportunity.location,
      sector: opportunity.sector,
      source_context: opportunity.source,
      summary: opportunity.summary,
      next_action: opportunity.nextAction,
      created_by: userId,
    }).select('*').single();
    if (error) throw error;
    return fromRow(data);
  },
  async getById(id) {
    const { data, error } = await supabase.from('opportunities').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? fromRow(data) : null;
  },
  async save(opportunity) {
    const { data, error } = await supabase.from('opportunities').update({
      name: opportunity.name,
      lifecycle: opportunity.lifecycleState,
      commercial_stage: opportunity.commercialStage,
      commercial_probability: opportunity.probability,
      priority: opportunity.priority,
      organization_id: opportunity.organizationId,
      site_location: opportunity.location,
      sector: opportunity.sector,
      source_context: opportunity.source,
      summary: opportunity.summary,
      next_action: opportunity.nextAction,
      updated_at: new Date().toISOString(),
    }).eq('id', opportunity.id).select('*').single();
    if (error) throw error;
    return fromRow(data);
  },
  async list() {
    const { data, error } = await supabase.from('opportunities').select('*').order('updated_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(fromRow);
  },
};
