import type { AuthorityRepository } from '../../application/ports/authorityRepository';
import type { AuthorityDelegation, AuthorityScopeType, UserPositionAssignment } from '../../domain/user/authority';
import { supabase } from '../auth/supabaseClient';

type ScopeRow = { type?: string; id?: string } | null;
type PositionRow = {
  id: string; workspace_id: string; user_id: string; role_family: UserPositionAssignment['roleFamily'];
  position_key: string; scope: ScopeRow; effective_from: string; effective_until: string | null; assigned_by: string | null;
};
type DelegationRow = {
  id: string; workspace_id: string; grantor_user_id: string; grantee_user_id: string; authority_key: AuthorityDelegation['authorityKey'];
  scope: ScopeRow; effective_from: string; effective_until: string | null; revoked_at: string | null; reason: string | null;
};

function parseScope(scope: ScopeRow): { scopeType: AuthorityScopeType; scopeId?: string } {
  const type = scope?.type;
  if (type === 'project_state' || type === 'document_family') {
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

    return ((data ?? []) as PositionRow[]).map((row) => ({
      id: row.id, workspaceId: row.workspace_id, userId: row.user_id, roleFamily: row.role_family,
      positionKey: row.position_key, ...parseScope(row.scope), activeFrom: row.effective_from,
      activeUntil: row.effective_until ?? undefined, assignedBy: row.assigned_by ?? '',
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

    return ((data ?? []) as DelegationRow[]).map((row) => ({
      id: row.id, workspaceId: row.workspace_id, grantedBy: row.grantor_user_id, grantedTo: row.grantee_user_id,
      authorityKey: row.authority_key, ...parseScope(row.scope), effectiveFrom: row.effective_from,
      effectiveUntil: row.effective_until ?? undefined, revokedAt: row.revoked_at ?? undefined, basis: row.reason ?? undefined,
    }));
  },
};
