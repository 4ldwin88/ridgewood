import type { ProtectedAction, AuthorizationVerification } from '../ports/authorizationVerification';
import type { AuthorityRepository } from '../ports/authorityRepository';
import type { UserState } from '../../domain/user/userState';
import { authorizeProtectedAction, type AuthorizationTarget, type AuthorizationDecision } from './authorizationPolicy';

export class GovernedCommandDeniedError extends Error {
  constructor(public readonly decision: AuthorizationDecision) {
    super(`Governed command denied: ${decision.denialReason ?? 'authorization_failed'}`);
    this.name = 'GovernedCommandDeniedError';
  }
}

export interface GovernedCommandDependencies {
  authorityRepository: AuthorityRepository;
  verification: AuthorizationVerification;
}

export interface GovernedCommandRequest<T> {
  action: ProtectedAction;
  user: UserState;
  target: AuthorizationTarget;
  execute: (decision: AuthorizationDecision) => Promise<T>;
}

/**
 * Single application boundary for protected mutations. A protected command may
 * execute only after permission, scoped business authority and fresh strong
 * verification all succeed. The verification result and authority basis are
 * passed to the mutation so they can be persisted in the audit trail.
 */
export async function executeGovernedCommand<T>(
  dependencies: GovernedCommandDependencies,
  request: GovernedCommandRequest<T>,
): Promise<T> {
  const [positions, delegations] = await Promise.all([
    dependencies.authorityRepository.listPositions(request.target.workspaceId, request.user.userId),
    dependencies.authorityRepository.listDelegations(request.target.workspaceId, request.user.userId),
  ]);

  const decision = await authorizeProtectedAction(
    request.action,
    { user: request.user, positions, delegations },
    request.target,
    dependencies.verification,
  );

  if (!decision.allowed) throw new GovernedCommandDeniedError(decision);
  return request.execute(decision);
}
