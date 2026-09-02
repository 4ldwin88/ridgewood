import type { GovernedAuditRepository } from '../../application/ports/governedAuditRepository';
import { supabase } from '../auth/supabaseClient';

export const supabaseGovernedAuditRepository: GovernedAuditRepository = {
  async append(input) {
    const { error } = await supabase.from('audit_events').insert({
      opportunity_id: input.opportunityId ?? null,
      project_id: input.projectId ?? null,
      event_type: `governed_command_${input.outcome}`,
      actor_user_id: input.actorUserId,
      payload: {
        workspaceId: input.workspaceId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        authorityKey: input.decision.authorityKey,
        authorityBasis: input.decision.authorityBasis ?? null,
        denialReason: input.decision.denialReason ?? null,
        verification: input.decision.verification
          ? {
              method: input.decision.verification.method,
              verified: input.decision.verification.verified,
              userVerified: input.decision.verification.userVerified ?? null,
              verifiedAt: input.decision.verification.verifiedAt ?? null,
              verificationReference: input.decision.verification.verificationReference ?? null,
            }
          : null,
        metadata: input.metadata ?? {},
      },
    });
    if (error) throw error;
  },
};
