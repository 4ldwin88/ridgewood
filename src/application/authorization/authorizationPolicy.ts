import type { AuthorizationVerification, AuthorizationVerificationResult, ProtectedAction } from '../ports/authorizationVerification';
import type { AppPermission, UserState } from '../../domain/user/userState';
import { hasPermission } from '../../domain/user/userState';
import type { AuthorityDelegation, UserPositionAssignment } from '../../domain/user/authority';
import { requiresFreshStrongVerification } from '../../domain/user/authority';

export type AuthorityScopeType = UserPositionAssignment['scopeType'];

export interface AuthorizationTarget {
  workspaceId: string;
  targetType: string;
  targetId: string;
  scopeType?: AuthorityScopeType;
  scopeId?: string;
  revisionId?: string;
}

export interface AuthorizationContext {
  user: UserState;
  positions: UserPositionAssignment[];
  delegations: AuthorityDelegation[];
  now?: string;
}

export type AuthorizationDenialReason =
  | 'workspace_mismatch'
  | 'missing_permission'
  | 'missing_business_authority'
  | 'verification_failed';

export interface AuthorizationDecision {
  allowed: boolean;
  action: ProtectedAction;
  permission: AppPermission;
  authorityKey: string;
  authorityBasis?: { kind: 'position' | 'delegation'; id: string };
  verification?: AuthorizationVerificationResult;
  denialReason?: AuthorizationDenialReason;
}

interface ActionRule {
  permission: AppPermission;
  authorityKey: string;
  allowedRoleFamilies: ReadonlySet<UserPositionAssignment['roleFamily']>;
}

const managerExecutive = new Set<UserPositionAssignment['roleFamily']>(['manager', 'executive']);
const executiveOnly = new Set<UserPositionAssignment['roleFamily']>(['executive']);

const rules: Record<ProtectedAction, ActionRule> = {
  'document.publish': { permission: 'document.publish', authorityKey: 'document.publish', allowedRoleFamilies: managerExecutive },
  'document.approve': { permission: 'document.publish', authorityKey: 'document.approve', allowedRoleFamilies: managerExecutive },
  'document.deny': { permission: 'document.publish', authorityKey: 'document.deny', allowedRoleFamilies: managerExecutive },
  'document.supersede': { permission: 'document.create_revision', authorityKey: 'document.supersede', allowedRoleFamilies: managerExecutive },
  'document.withdraw': { permission: 'document.publish', authorityKey: 'document.withdraw', allowedRoleFamilies: managerExecutive },
  'proposal.approve': { permission: 'proposal.approve', authorityKey: 'proposal.approve', allowedRoleFamilies: executiveOnly },
  'proposal.deny': { permission: 'proposal.deny', authorityKey: 'proposal.deny', allowedRoleFamilies: executiveOnly },
  'project.authorize': { permission: 'project.authorize', authorityKey: 'project.authorize', allowedRoleFamilies: executiveOnly },
  'user.assign_role': { permission: 'user.manage_roles', authorityKey: 'user.assign_role', allowedRoleFamilies: executiveOnly },
  'user.assign_position': { permission: 'user.manage_roles', authorityKey: 'user.assign_position', allowedRoleFamilies: executiveOnly },
  'user.change_permission': { permission: 'user.manage_roles', authorityKey: 'user.change_permission', allowedRoleFamilies: executiveOnly },
  'user.delegate_authority': { permission: 'user.manage_roles', authorityKey: 'user.delegate_authority', allowedRoleFamilies: executiveOnly },
};

function isActive(from: string, until: string | undefined, now: Date): boolean {
  const start = new Date(from);
  const end = until ? new Date(until) : undefined;
  return start <= now && (!end || now < end);
}

function scopeMatches(scopeType: AuthorityScopeType, scopeId: string | undefined, target: AuthorizationTarget): boolean {
  if (scopeType === 'workspace') return true;
  return target.scopeType === scopeType && Boolean(scopeId) && scopeId === target.scopeId;
}

function findAuthorityBasis(
  action: ProtectedAction,
  context: AuthorizationContext,
  target: AuthorizationTarget,
): AuthorizationDecision['authorityBasis'] | undefined {
  const rule = rules[action];
  const now = new Date(context.now ?? new Date().toISOString());

  const position = context.positions.find((item) =>
    item.workspaceId === target.workspaceId &&
    item.userId === context.user.userId &&
    rule.allowedRoleFamilies.has(item.roleFamily) &&
    isActive(item.activeFrom, item.activeUntil, now) &&
    scopeMatches(item.scopeType, item.scopeId, target),
  );
  if (position) return { kind: 'position', id: position.id };

  const delegation = context.delegations.find((item) =>
    item.workspaceId === target.workspaceId &&
    item.grantedTo === context.user.userId &&
    item.authorityKey === rule.authorityKey &&
    !item.revokedAt &&
    isActive(item.effectiveFrom, item.effectiveUntil, now) &&
    scopeMatches(item.scopeType, item.scopeId, target),
  );
  return delegation ? { kind: 'delegation', id: delegation.id } : undefined;
}

/**
 * Evaluates technical permission and governed business authority before invoking
 * fresh user verification. Verification is intentionally last so a biometric/
 * device prompt is never shown for an action the user is not authorized to take.
 */
export async function authorizeProtectedAction(
  action: ProtectedAction,
  context: AuthorizationContext,
  target: AuthorizationTarget,
  verification: AuthorizationVerification,
): Promise<AuthorizationDecision> {
  const rule = rules[action];

  if (context.user.workspaceId !== target.workspaceId) {
    return { allowed: false, action, permission: rule.permission, authorityKey: rule.authorityKey, denialReason: 'workspace_mismatch' };
  }

  if (!hasPermission(context.user, rule.permission)) {
    return { allowed: false, action, permission: rule.permission, authorityKey: rule.authorityKey, denialReason: 'missing_permission' };
  }

  const authorityBasis = findAuthorityBasis(action, context, target);
  if (!authorityBasis) {
    return { allowed: false, action, permission: rule.permission, authorityKey: rule.authorityKey, denialReason: 'missing_business_authority' };
  }

  let verificationResult: AuthorizationVerificationResult | undefined;
  if (requiresFreshStrongVerification(action)) {
    verificationResult = await verification.verify({
      action,
      targetType: target.targetType,
      targetId: target.targetId,
      revisionId: target.revisionId,
    });
    if (!verificationResult.verified || verificationResult.userVerified === false) {
      return {
        allowed: false,
        action,
        permission: rule.permission,
        authorityKey: rule.authorityKey,
        authorityBasis,
        verification: verificationResult,
        denialReason: 'verification_failed',
      };
    }
  }

  return { allowed: true, action, permission: rule.permission, authorityKey: rule.authorityKey, authorityBasis, verification: verificationResult };
}
