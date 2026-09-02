import type { AuthorizationDecision } from '../authorization/authorizationPolicy';
import type { ProtectedAction } from './authorizationVerification';

export interface GovernedAuditInput {
  workspaceId: string;
  actorUserId: string;
  action: ProtectedAction;
  targetType: string;
  targetId: string;
  opportunityId?: string;
  projectId?: string;
  decision: AuthorizationDecision;
  outcome: 'executed' | 'denied' | 'failed';
  metadata?: Record<string, unknown>;
}

export interface GovernedAuditRepository {
  append(input: GovernedAuditInput): Promise<void>;
}
