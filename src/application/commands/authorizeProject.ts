import type { UserState } from '../../domain/user/userState';
import type { GovernedCommandDependencies } from '../authorization/governedCommand';

export interface AuthorizeProjectCommand {
  workspaceId: string;
  projectStateId: string;
}

/**
 * Project Authorization remains unavailable until the trusted server command
 * validates explicit scoped business authority, governed readiness and
 * command-bound, short-lived, replay-protected strong verification.
 */
export async function authorizeProject(
  dependencies: GovernedCommandDependencies,
  user: UserState,
  command: AuthorizeProjectCommand,
): Promise<never> {
  void dependencies;
  void user;
  void command;
  throw new Error('Project Authorization is locked until trusted server-side authority and verification controls are available.');
}
