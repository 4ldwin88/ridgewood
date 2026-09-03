import type { UserState } from '../../domain/user/userState';
import type { GovernedCommandDependencies } from '../authorization/governedCommand';

export interface AuthorizeProjectCommand {
  workspaceId: string;
  projectStateId: string;
}

/**
 * Project Authorization is intentionally unavailable until the server-side
 * command can validate explicit scoped business authority, canonical readiness
 * and command-bound, short-lived, replay-protected strong verification.
 *
 * Never replace this fail-closed boundary with browser-supplied booleans,
 * verification timestamps, authority strings or readiness/evidence snapshots.
 * Authorization must transition the existing Project State identity atomically.
 */
export async function authorizeProject(
  _dependencies: GovernedCommandDependencies,
  _user: UserState,
  _command: AuthorizeProjectCommand,
): Promise<never> {
  throw new Error('Project Authorization is locked until trusted server-side authority and verification controls are available.');
}
