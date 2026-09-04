import type { PredevelopmentDomain, PredevelopmentDomainState, ReadinessState } from '../../domain/predevelopment/predevelopment';
import { supabase } from '../auth/supabaseClient';

type PredevelopmentRow = {
  project_state_id: string;
  domain_key: PredevelopmentDomain;
  readiness: ReadinessState;
  notes: string | null;
  updated_at: string;
};

function fromRow(row: PredevelopmentRow): PredevelopmentDomainState {
  return {
    projectStateId: row.project_state_id,
    domain: row.domain_key,
    readiness: row.readiness,
    summary: row.notes ?? undefined,
    blockers: [],
    unknowns: [],
    updatedAt: row.updated_at,
  };
}

async function requireAuthentication(): Promise<void> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw error ?? new Error('Authentication required.');
}

export async function ensurePredevelopmentDomains(projectStateId: string): Promise<PredevelopmentDomainState[]> {
  await requireAuthentication();
  const { data, error } = await supabase.rpc('ensure_project_state_predevelopment_domains', { project_state_input: projectStateId });
  if (error) throw error;
  return ((data ?? []) as PredevelopmentRow[]).map(fromRow);
}

export async function listPredevelopmentDomains(projectStateId: string): Promise<PredevelopmentDomainState[]> {
  await requireAuthentication();
  const { data, error } = await supabase.from('predevelopment_domains').select('project_state_id,domain_key,readiness,notes,updated_at').eq('project_state_id', projectStateId).order('domain_key');
  if (error) throw error;
  return ((data ?? []) as PredevelopmentRow[]).map(fromRow);
}

export async function updatePredevelopmentDomain(projectStateId: string, domain: PredevelopmentDomain, readiness: ReadinessState, notes: string): Promise<PredevelopmentDomainState> {
  await requireAuthentication();
  const { error } = await supabase.rpc('update_project_state_predevelopment_domain', {
    project_state_input: projectStateId,
    domain_input: domain,
    readiness_input: readiness,
    notes_input: notes,
  });
  if (error) throw error;

  const { data: persisted, error: verificationError } = await supabase
    .from('predevelopment_domains')
    .select('project_state_id,domain_key,readiness,notes,updated_at')
    .eq('project_state_id', projectStateId)
    .eq('domain_key', domain)
    .maybeSingle();
  if (verificationError) throw verificationError;
  if (!persisted || persisted.readiness !== readiness) {
    throw new Error('Predevelopment save could not be verified. Reload this Project State before trying again.');
  }
  return fromRow(persisted as PredevelopmentRow);
}
