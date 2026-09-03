import { PREDEVELOPMENT_DOMAINS, type PredevelopmentDomain, type PredevelopmentDomainState, type ReadinessState } from '../../domain/predevelopment/predevelopment';
import { supabase } from '../auth/supabaseClient';

type PredevelopmentRow = {
  project_state_id: string;
  domain_key: PredevelopmentDomain;
  readiness: ReadinessState;
  notes: string | null;
  updated_at: string;
};

export async function ensurePredevelopmentDomains(projectStateId: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error('Authentication required.');
  const rows = PREDEVELOPMENT_DOMAINS.map((domainKey) => ({ project_state_id: projectStateId, domain_key: domainKey, readiness: 'not_started', updated_by: uid }));
  const { error } = await supabase.from('predevelopment_domains').upsert(rows, { onConflict: 'project_state_id,domain_key', ignoreDuplicates: true });
  if (error) throw error;
}
export async function listPredevelopmentDomains(projectStateId: string): Promise<PredevelopmentDomainState[]> {
  const { data, error } = await supabase.from('predevelopment_domains').select('project_state_id,domain_key,readiness,notes,updated_at').eq('project_state_id', projectStateId).order('domain_key');
  if (error) throw error;
  return ((data ?? []) as PredevelopmentRow[]).map((row) => ({ projectStateId: row.project_state_id, domain: row.domain_key, readiness: row.readiness, summary: row.notes ?? undefined, blockers: [], unknowns: [], updatedAt: row.updated_at }));
}
export async function updatePredevelopmentDomain(projectStateId: string, domain: PredevelopmentDomain, readiness: ReadinessState, notes: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error('Authentication required.');
  const { error } = await supabase.from('predevelopment_domains').update({ readiness, notes: notes.trim() || null, updated_by: uid, updated_at: new Date().toISOString() }).eq('project_state_id', projectStateId).eq('domain_key', domain);
  if (error) throw error;
}
