import { describe, expect, it } from 'vitest';
import { evaluateSetupGate, setupRequirements, type SetupGateInput, type ConditionalObligation } from '../../src/domain/project-state/setupGate';

function ready(): SetupGateInput {
  return {
    projectStateId: 'project-1', workspaceId: 'workspace-1', actorUserId: 'owner-1', activeMember: true,
    hasDecisionPermission: true, stage: 'project_authorization_setup', archived: false, activeProject: true,
    upstreamAuthorizationId: 'frozen-authorization-1', disposition: 'go', rationale: 'Reviewed evidence', now: '2026-09-12T00:00:00Z',
    evidence: setupRequirements.map(r => ({ requirement: r.key, state: 'satisfied', details: 'Reviewed basis', evidenceReference: 'record:1', accountableUserId: 'lead-1', materialBlocker: false })),
    obligations: [], authority: [{ id: 'authority-1', userId: 'owner-1', workspaceId: 'workspace-1', category: 'project.gate01.decide', basis: 'confirmed_owner', ownerApprovalReference: 'owner-identity-record:1', effectiveFrom: '2026-09-01T00:00:00Z', permitsConditionalGo: false, conditionalRequirements: [] }],
  };
}
function obligation(): ConditionalObligation {
  return { requirement: 'communications', description: 'Confirm meeting cadence', reasonToAdvance: 'Formal instructions already controlled', permittedLimits: 'Coordination only; no site work or new commitments', ownerUserId: 'lead-1', dueDate: '2026-09-14T00:00:00Z', consequence: 'Hold affected coordination until resolved' };
}
describe('Gate 01 decision contract', () => {
  it('advances the same project only through a valid Gate 01 decision', () => {
    const input = ready(); const copy = structuredClone(input);
    expect(evaluateSetupGate(input)).toMatchObject({ allowed: true, advances: true, gate: 'gate_01', nextStage: 'preconstruction_mobilization', authorityId: 'authority-1' });
    expect(input).toEqual(copy);
  });
  it.each(['hold', 'no_go'] as const)('%s retains a review without advancing despite missing evidence', disposition => {
    const input = ready(); input.disposition = disposition; input.evidence = [];
    expect(evaluateSetupGate(input)).toMatchObject({ allowed: true, advances: false, nextStage: null });
  });
  it.each(['missing', 'revoked', 'expired', 'future', 'wrong_project', 'wrong_workspace', 'no_owner_reference'] as const)('fails closed for %s authority', state => {
    const input = ready(); const a = input.authority[0];
    if (state === 'missing') input.authority = [];
    if (state === 'revoked') a.revokedAt = input.now;
    if (state === 'expired') a.effectiveUntil = input.now;
    if (state === 'future') a.effectiveFrom = '2027-01-01T00:00:00Z';
    if (state === 'wrong_project') a.projectStateId = 'other-project';
    if (state === 'wrong_workspace') a.workspaceId = 'other-workspace';
    if (state === 'no_owner_reference') a.ownerApprovalReference = '';
    expect(evaluateSetupGate(input).blockers).toContain('owner_authority_unresolved');
  });
  it.each(['outsider', 'read_only', 'archived', 'inactive', 'wrong_stage', 'missing_snapshot'] as const)('rejects %s context', state => {
    const input = ready();
    if (state === 'outsider') input.activeMember = false;
    if (state === 'read_only') input.hasDecisionPermission = false;
    if (state === 'archived') input.archived = true;
    if (state === 'inactive') input.activeProject = false;
    if (state === 'wrong_stage') input.stage = 'preconstruction_mobilization';
    if (state === 'missing_snapshot') input.upstreamAuthorizationId = '';
    expect(evaluateSetupGate(input).allowed).toBe(false);
  });
  it('requires evidence, assigned responsibility, and an explicit N/A reason', () => {
    const input = ready(); const permits = input.evidence.find(e => e.requirement === 'permits')!;
    permits.state = 'not_applicable';
    expect(evaluateSetupGate(input).unmet).toContain('permits');
    permits.notApplicableReason = 'No permit-requiring activity in this scope';
    expect(evaluateSetupGate(input).allowed).toBe(true);
    permits.accountableUserId = '';
    expect(evaluateSetupGate(input).allowed).toBe(false);
  });
  it('never substitutes duplicate evidence for a single controlling basis', () => {
    const input = ready(); input.evidence.push({ ...input.evidence[0] });
    expect(evaluateSetupGate(input).allowed).toBe(false);
  });
  it('requires explicit conditional scope and complete obligations', () => {
    const input = ready(); input.disposition = 'conditional_go';
    input.evidence.find(e => e.requirement === 'communications')!.state = 'unresolved';
    input.obligations = [obligation()];
    expect(evaluateSetupGate(input).allowed).toBe(false);
    input.authority[0].permitsConditionalGo = true;
    expect(evaluateSetupGate(input).allowed).toBe(false);
    input.authority[0].conditionalRequirements = ['communications'];
    expect(evaluateSetupGate(input).advances).toBe(true);
    input.obligations[0].permittedLimits = '';
    expect(evaluateSetupGate(input).allowed).toBe(false);
  });
  it('rejects material disqualifying conditions even with conditional authority', () => {
    const input = ready(); input.disposition = 'conditional_go'; input.obligations = [obligation()];
    input.authority[0].permitsConditionalGo = true; input.authority[0].conditionalRequirements = ['communications'];
    input.evidence[0].materialBlocker = true;
    expect(evaluateSetupGate(input).blockers).toContain('material_disqualifying_condition');
  });
  it('does not waive contract approval through Conditional Go', () => {
    const input = ready(); input.disposition = 'conditional_go'; input.obligations = [{ ...obligation(), requirement: 'contract_review' }];
    input.authority[0].permitsConditionalGo = true; input.authority[0].conditionalRequirements = ['contract_review'];
    input.evidence.find(e => e.requirement === 'contract_review')!.state = 'unresolved';
    expect(evaluateSetupGate(input).blockers).toContain('nonconditional_requirement:contract_review');
  });
  it('rejects an overdue obligation', () => {
    const input = ready(); input.disposition = 'conditional_go'; input.obligations = [{ ...obligation(), dueDate: input.now }];
    input.authority[0].permitsConditionalGo = true; input.authority[0].conditionalRequirements = ['communications'];
    expect(evaluateSetupGate(input).blockers).toContain('incomplete_or_overdue_obligation');
  });
});
