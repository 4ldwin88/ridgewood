import type { AuthorityRepository } from '../../application/ports/authorityRepository';
import type { AuthorityDelegation, UserPositionAssignment } from '../../domain/user/authority';
import { supabase } from '../supabase/supabaseClient';

type ScopeRow = { type?: UserPositionAssignment['scopeType']; id?: string } | null;

function parseScope(scope: ScopeRow): Pick<UserPositionAssignment, 'scopeType' | 'scopeId'> {
  const type = scope?.type;
  if (type === 'opportunity' || type === 'project' || type === 'document_family') {
    return { scopeType: type, scopeId: scope?.id };
  }
  return { scopeType: 'workspace' };
}

export const supabaseAuthorityRepository: AuthorityRepository = {
  async listPositions(workspaceId, userId): Promise<UserPositionAssignment[]> {
    const { data, error } = await supabase
      .from('position_assignments')
      .select('id,workspace_id,user_id,role_family,position_key,scope,effective_from,effective_until,assigned_by')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('status', 'active');
    if (error) throw error;

    return (data ?? []).map((row) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      userId: row.user_id,
      roleFamily: row.role_family,
      positionKey: row.position_key,
      ...parseScope(row.scope as ScopeRow),
      activeFrom: row.effective_from,
      activeUntil: row.effective_until ?? undefined,
      assignedBy: row.assigned_by ?? '',
    }));
  },

  async listDelegations(workspaceId, userId): Promise<AuthorityDelegation[]> {
    const { data, error } = await supabase
      .from('authority_delegations')
      .select('id,workspace_id,grantor_user_id,grantee_user_id,authority_key,scope,effective_from,effective_until,revoked_at,reason')
      .eq('workspace_id', workspaceId)
      .eq('grantee_user_id', userId)
      .eq('status', 'active');
    if (error) throw error;

    return (data ?? []).map((row) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      grantedBy: row.grantor_user_id,
      grantedTo: row.grantee_user_id,
      authorityKey: row.authority_key,
      ...parseScope(row.scope as ScopeRow),
      effectiveFrom: row.effective_from,
      effectiveUntil: row.effective_until ?? undefined,
      revokedAt: row.revoked_at ?? undefined,
      basis: row.reason ?? undefined,
    }));
  },
};
