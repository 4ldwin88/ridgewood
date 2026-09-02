import type { UserState } from '../../domain/user/userState';
import type { GovernedCommandDependencies } from '../authorization/governedCommand';
import { executeGovernedCommand } from '../authorization/governedCommand';
import { supabase } from '../../infrastructure/auth/supabaseClient';

export interface AuthorizeProjectCommand {
  workspaceId: string;
  opportunityId: string;
  projectId: string;
  projectName: string;
  readinessSnapshot: Record<string, unknown>;
  evidenceSnapshot: Record<string, unknown>;
}

export async function authorizeProject(
  dependencies: GovernedCommandDependencies,
  user: UserState,
  command: AuthorizeProjectCommand,
): Promise<string> {
  return executeGovernedCommand(dependencies, {
    action: 'project.authorize',
    user,
    target: {
      workspaceId: command.workspaceId,
      targetType: 'opportunity',
      targetId: command.opportunityId,
      scopeType: 'opportunity',
      scopeId: command.opportunityId,
    },
    execute: async (decision) => {
      const verification = decision.verification;
      if (!verification?.verified || verification.userVerified === false) {
        throw new Error('Fresh strong verification is required for Project Authorization.');
      }
      const { data, error } = await supabase.rpc('authorize_project_atomic', {
        target_opportunity_id: command.opportunityId,
        target_project_id: command.projectId,
        project_name: command.projectName,
        authority_basis_text: `${decision.authorityBasis?.kind ?? 'unknown'}:${decision.authorityBasis?.id ?? 'unknown'}`,
        readiness_snapshot_input: command.readinessSnapshot,
        evidence_snapshot_input: command.evidenceSnapshot,
        verification_input: {
          method: verification.method,
          verified: verification.verified,
          userVerified: verification.userVerified ?? null,
          verifiedAt: verification.verifiedAt ?? null,
          verificationReference: verification.verificationReference ?? null,
        },
      });
      if (error) throw error;
      return String(data);
    },
  });
}
