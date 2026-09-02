import type { Opportunity } from '../../domain/opportunity/opportunity';
import type { AuthorizationReadiness } from '../../domain/project/project';

export interface AuthorizationContext {
  actorPersonId: string;
  hasProjectAuthorizationAuthority: boolean;
}

export function evaluateAuthorizationReadiness(
  opportunity: Opportunity,
  predevelopmentReady: boolean,
  unresolvedBlockers: string[],
  unresolvedUnknowns: string[],
): AuthorizationReadiness {
  const blockers = [...unresolvedBlockers];
  const unknowns = [...unresolvedUnknowns];

  if (opportunity.lifecycleState !== 'authorization_ready') {
    blockers.push('Opportunity has not reached Authorization Ready.');
  }
  if (!predevelopmentReady) {
    blockers.push('Predevelopment is not sufficiently ready for Project Authorization.');
  }

  return {
    opportunityId: opportunity.id,
    ready: blockers.length === 0 && unknowns.length === 0,
    blockers,
    unknowns,
  };
}

export function assertCanAuthorizeProject(
  readiness: AuthorizationReadiness,
  context: AuthorizationContext,
): void {
  if (!context.hasProjectAuthorizationAuthority) {
    throw new Error('Actor does not have Project Authorization authority.');
  }
  if (!readiness.ready) {
    throw new Error('Opportunity is not ready for Project Authorization.');
  }
}
