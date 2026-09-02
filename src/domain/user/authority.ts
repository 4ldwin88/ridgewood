import type { ProtectedAction } from '../../application/ports/authorizationVerification';

export type RoleFamily = 'operator' | 'manager' | 'executive';

export interface UserPositionAssignment {
  id: string;
  userId: string;
  workspaceId: string;
  roleFamily: RoleFamily;
  positionKey: string;
  scopeType: 'workspace' | 'opportunity' | 'project' | 'document_family';
  scopeId?: string;
  activeFrom: string;
  activeUntil?: string;
  assignedBy: string;
}

export interface AuthorityDelegation {
  id: string;
  workspaceId: string;
  grantedBy: string;
  grantedTo: string;
  authorityKey: string;
  scopeType: UserPositionAssignment['scopeType'];
  scopeId?: string;
  effectiveFrom: string;
  effectiveUntil?: string;
  revokedAt?: string;
  basis?: string;
}

export const protectedActions: ReadonlySet<ProtectedAction> = new Set([
  'document.publish',
  'document.approve',
  'document.deny',
  'document.supersede',
  'document.withdraw',
  'proposal.approve',
  'proposal.deny',
  'project.authorize',
  'user.assign_role',
  'user.assign_position',
  'user.change_permission',
  'user.delegate_authority',
]);

export function requiresFreshStrongVerification(action: ProtectedAction): boolean {
  return protectedActions.has(action);
}
