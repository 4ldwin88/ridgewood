import type { ProjectState } from '../../domain/project-state/projectState';
import type { AuthorizationReadiness } from '../../domain/project/project';

export interface AuthorizationContext {
  actorPersonId: string;
  hasProjectAuthorizationAuthority: boolean;
}

export function evaluateAuthorizationReadiness(
  projectState: ProjectState,
  predevelopmentReady: boolean,
  unresolvedBlockers: string[],
  unresolvedUnknowns: string[],
): AuthorizationReadiness {
  const blockers = [...unresolvedBlockers];
  const unknowns = [...unresolvedUnknowns];

  if (projectState.status !== 'active') {
    blockers.push(`Project State status is ${projectState.status}.`);
  }
  if (projectState.stage !== 'predevelopment' && projectState.stage !== 'authorization') {
    blockers.push('Project State has not completed the required Predevelopment path.');
  }
  if (!predevelopmentReady) {
    blockers.push('Predevelopment is not sufficiently ready for Project Authorization.');
  }

  return {
    projectStateId: projectState.id,
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
    throw new Error('Project State is not ready for Project Authorization.');
  }
}
