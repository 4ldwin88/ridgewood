/** Gate 01 planning/readiness contract. The database must independently enforce it.
 * This module does not grant authority or execute a lifecycle transition.
 */
export const setupRequirements = [
  { key: 'contracting_party', label: 'Legal contracting party', conditional: false, optional: false },
  { key: 'contract_review', label: 'Reviewed and approved contract / written authorization', conditional: false, optional: false },
  { key: 'scope', label: 'Approved scope, exclusions, allowances and owner-supplied items', conditional: false, optional: false },
  { key: 'commercial_terms', label: 'Value / fee and payment terms', conditional: false, optional: false },
  { key: 'contractual_risks', label: 'Insurance, bonding, indemnity and other material risks', conditional: false, optional: false },
  { key: 'permits', label: 'Required permits / approvals and responsible parties', conditional: false, optional: true },
  { key: 'leadership', label: 'Project Lead and required role coverage', conditional: false, optional: false },
  { key: 'budget_basis', label: 'Initial budget and control basis', conditional: false, optional: false },
  { key: 'delivery_folder', label: 'Authoritative delivery folder and document locations', conditional: false, optional: false },
  { key: 'access', label: 'Appropriate team and restricted-record access', conditional: false, optional: false },
  { key: 'communications', label: 'Formal instructions and coordination channels', conditional: true, optional: false },
  { key: 'controls', label: 'Applicable initialized project controls', conditional: true, optional: false },
] as const;

export type SetupRequirementKey = typeof setupRequirements[number]['key'];
export type GateDisposition = 'go' | 'conditional_go' | 'hold' | 'no_go';
export interface SetupEvidence {
  requirement: SetupRequirementKey;
  state: 'unresolved' | 'satisfied' | 'not_applicable';
  details: string;
  evidenceReference: string;
  accountableUserId: string;
  materialBlocker: boolean;
  notApplicableReason?: string;
}
export interface ConditionalObligation {
  requirement: SetupRequirementKey;
  description: string;
  reasonToAdvance: string;
  permittedLimits: string;
  ownerUserId: string;
  dueDate?: string;
  dueTrigger?: string;
  consequence: string;
}
export interface GateAuthority {
  id: string;
  userId: string;
  workspaceId: string;
  projectStateId?: string;
  category: 'project.gate01.decide';
  basis: 'confirmed_owner' | 'owner_approved_delegation';
  ownerApprovalReference: string;
  effectiveFrom: string;
  effectiveUntil?: string;
  revokedAt?: string;
  permitsConditionalGo: boolean;
  conditionalRequirements: SetupRequirementKey[];
}
export interface SetupGateInput {
  projectStateId: string;
  workspaceId: string;
  actorUserId: string;
  activeMember: boolean;
  hasDecisionPermission: boolean;
  stage: string;
  archived: boolean;
  activeProject: boolean;
  upstreamAuthorizationId: string;
  evidence: SetupEvidence[];
  obligations: ConditionalObligation[];
  authority: GateAuthority[];
  disposition: GateDisposition;
  rationale: string;
  now: string;
}

const present = (value?: string): boolean => Boolean(value?.trim());
const time = (value?: string): number => value ? Date.parse(value) : NaN;

export function evaluateSetupGate(input: SetupGateInput) {
  const blockers: string[] = [];
  const now = time(input.now);
  if (!Number.isFinite(now)) blockers.push('invalid_review_time');
  if (!present(input.projectStateId) || !present(input.workspaceId) || !present(input.actorUserId)) blockers.push('missing_identity');
  if (!input.activeMember) blockers.push('workspace_access_denied');
  if (!input.hasDecisionPermission) blockers.push('missing_gate_decision_permission');
  if (input.archived || !input.activeProject || input.stage !== 'project_authorization_setup') blockers.push('gate_not_applicable');
  if (!present(input.upstreamAuthorizationId)) blockers.push('missing_frozen_authorization');
  if (!present(input.rationale)) blockers.push('decision_rationale_required');
  if (!['go', 'conditional_go', 'hold', 'no_go'].includes(input.disposition)) blockers.push('invalid_disposition');

  // No position, role, operating mode or membership is an authority substitute.
  const authority = input.authority.find(a =>
    present(a.id) && a.userId === input.actorUserId && a.workspaceId === input.workspaceId &&
    (!a.projectStateId || a.projectStateId === input.projectStateId) &&
    a.category === 'project.gate01.decide' && present(a.ownerApprovalReference) &&
    ['confirmed_owner', 'owner_approved_delegation'].includes(a.basis) &&
    !a.revokedAt && time(a.effectiveFrom) <= now &&
    (!a.effectiveUntil || now < time(a.effectiveUntil)) &&
    (input.disposition !== 'conditional_go' || a.permitsConditionalGo));
  if (!authority) blockers.push('owner_authority_unresolved');

  const unmet: SetupRequirementKey[] = [];
  for (const requirement of setupRequirements) {
    const rows = input.evidence.filter(e => e.requirement === requirement.key);
    if (rows.length !== 1) { unmet.push(requirement.key); continue; }
    const row = rows[0];
    const hasBasis = present(row.details) && present(row.accountableUserId) && present(row.evidenceReference);
    const satisfied = !row.materialBlocker && hasBasis &&
      (row.state === 'satisfied' || (row.state === 'not_applicable' && requirement.optional && present(row.notApplicableReason)));
    if (!satisfied) unmet.push(requirement.key);
  }
  const advancing = input.disposition === 'go' || input.disposition === 'conditional_go';
  if (advancing) {
    if (input.evidence.some(e => e.materialBlocker)) blockers.push('material_disqualifying_condition');
    if (input.disposition === 'go' && (unmet.length || input.obligations.length)) blockers.push('go_requires_satisfied_conditions');
    if (input.disposition === 'conditional_go') {
      if (!input.obligations.length) blockers.push('conditional_go_requires_obligations');
      for (const key of unmet) {
        const rule = setupRequirements.find(r => r.key === key)!;
        if (!rule.conditional) blockers.push(`nonconditional_requirement:${key}`);
        if (!input.obligations.some(o => o.requirement === key)) blockers.push(`missing_obligation:${key}`);
      }
      const seen = new Set<string>();
      for (const obligation of input.obligations) {
        const rule = setupRequirements.find(r => r.key === obligation.requirement);
        if (!rule?.conditional || !authority?.conditionalRequirements.includes(obligation.requirement) || seen.has(obligation.requirement)) blockers.push('invalid_obligation_scope');
        seen.add(obligation.requirement);
        if (![obligation.description, obligation.reasonToAdvance, obligation.permittedLimits, obligation.ownerUserId, obligation.consequence].every(present) ||
          (!present(obligation.dueTrigger) && !present(obligation.dueDate)) ||
          (present(obligation.dueDate) && !(time(obligation.dueDate) > now))) blockers.push('incomplete_or_overdue_obligation');
      }
    }
  }
  return {
    allowed: blockers.length === 0,
    advances: blockers.length === 0 && advancing,
    gate: 'gate_01' as const,
    nextStage: blockers.length === 0 && advancing ? 'preconstruction_mobilization' as const : null,
    authorityId: authority?.id ?? null,
    blockers: [...new Set(blockers)],
    unmet,
  };
}
