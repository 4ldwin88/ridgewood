import type { Opportunity, OpportunityLifecycleState } from '../../domain/opportunity/opportunity';

export type QualificationOutcome = 'advance' | 'hold' | 'decline';

export interface QualificationDecision {
  outcome: QualificationOutcome;
  rationale: string;
  decidedBy: string;
  decidedAt: string;
}

export interface OpportunityCommandResult {
  opportunity: Opportunity;
  event: {
    type: string;
    opportunityId: string;
    occurredAt: string;
    actorId: string;
    metadata: Record<string, unknown>;
  };
}

function transition(
  opportunity: Opportunity,
  next: OpportunityLifecycleState,
  actorId: string,
  eventType: string,
  metadata: Record<string, unknown> = {},
  occurredAt = new Date().toISOString(),
): OpportunityCommandResult {
  return {
    opportunity: { ...opportunity, lifecycleState: next, updatedAt: occurredAt },
    event: { type: eventType, opportunityId: opportunity.id, occurredAt, actorId, metadata },
  };
}

export function beginQualification(
  opportunity: Opportunity,
  actorId: string,
  occurredAt = new Date().toISOString(),
): OpportunityCommandResult {
  if (!['potential', 'held'].includes(opportunity.lifecycleState)) {
    throw new Error(`Qualification cannot begin from ${opportunity.lifecycleState}.`);
  }
  return transition(opportunity, 'qualification', actorId, 'qualification_started', {}, occurredAt);
}

export function recordQualificationDecision(
  opportunity: Opportunity,
  decision: QualificationDecision,
): OpportunityCommandResult {
  if (!decision.rationale.trim()) throw new Error('Qualification rationale is required.');
  if (opportunity.lifecycleState !== 'qualification') {
    throw new Error(`Qualification cannot be decided from ${opportunity.lifecycleState}.`);
  }

  const next: OpportunityLifecycleState =
    decision.outcome === 'advance' ? 'predevelopment' : decision.outcome === 'hold' ? 'held' : 'declined';

  return transition(opportunity, next, decision.decidedBy, 'qualification_decided', {
    outcome: decision.outcome,
    rationale: decision.rationale,
  }, decision.decidedAt);
}

export function beginPredevelopment(
  opportunity: Opportunity,
  actorId: string,
  occurredAt = new Date().toISOString(),
): OpportunityCommandResult {
  if (opportunity.lifecycleState !== 'qualification') {
    throw new Error('Predevelopment requires an Opportunity in Qualification.');
  }
  return transition(opportunity, 'predevelopment', actorId, 'predevelopment_started', {}, occurredAt);
}
