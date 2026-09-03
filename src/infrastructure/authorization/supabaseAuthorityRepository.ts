import type { AuthorityRepository } from '../../application/ports/authorityRepository';
import type { AuthorityDelegation, AuthorityScopeType, UserPositionAssignment } from '../../domain/user/authority';
import { supabase } from '../auth/supabaseClient';

type ScopeRow = { type?: string; id?: string } | null;
type PositionRow = { id:string;workspace_id:string;user_id:string;role_family:UserPositionAssignment['roleFamily'];position_key:string;scope:ScopeRow;effective_from:string;effective_until:string|null;assigned_by:string|null };
type DelegationRow = { id:string;workspace_id:string;grantor_user_id:string;grantee_user_id:string;authority_key:AuthorityDelegation['authorityKey'];scope:ScopeRow;effective_from:string;effective_until:string|null;revoked_at:string|null;reason:string|null };
type ParsedScope={scopeType:AuthorityScopeType;scopeId?:string};

// Authority parsing must fail closed. An unknown/legacy scope must never be widened to workspace authority.
function parseScope(scope:ScopeRow):ParsedScope|null {
  if (!scope || scope.type === 'workspace') return {scopeType:'workspace'};
  if (scope.type === 'project_state' && scope.id) return {scopeType:'project_state',scopeId:scope.id};
  if (scope.type === 'document_family' && scope.id) return {scopeType:'document_family',scopeId:scope.id};
  return null;
}

export const supabaseAuthorityRepository:AuthorityRepository={
 async listPositions(workspaceId,userId){const{data,error}=await supabase.from('position_assignments').select('id,workspace_id,user_id,role_family,position_key,scope,effective_from,effective_until,assigned_by').eq('workspace_id',workspaceId).eq('user_id',userId).eq('status','active');if(error)throw error;return((data??[])as PositionRow[]).flatMap(row=>{const scope=parseScope(row.scope);if(!scope)return[];return[{id:row.id,workspaceId:row.workspace_id,userId:row.user_id,roleFamily:row.role_family,positionKey:row.position_key,...scope,activeFrom:row.effective_from,activeUntil:row.effective_until??undefined,assignedBy:row.assigned_by??''}]})},
 async listDelegations(workspaceId,userId){const{data,error}=await supabase.from('authority_delegations').select('id,workspace_id,grantor_user_id,grantee_user_id,authority_key,scope,effective_from,effective_until,revoked_at,reason').eq('workspace_id',workspaceId).eq('grantee_user_id',userId).eq('status','active');if(error)throw error;return((data??[])as DelegationRow[]).flatMap(row=>{const scope=parseScope(row.scope);if(!scope)return[];return[{id:row.id,workspaceId:row.workspace_id,grantedBy:row.grantor_user_id,grantedTo:row.grantee_user_id,authorityKey:row.authority_key,...scope,effectiveFrom:row.effective_from,effectiveUntil:row.effective_until??undefined,revokedAt:row.revoked_at??undefined,basis:row.reason??undefined}]})}
};
