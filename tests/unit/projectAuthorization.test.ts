import { describe, expect, it } from 'vitest';
import { assertCanAuthorizeProject, evaluateAuthorizationReadiness } from '../../src/application/policies/projectAuthorization';
import type { Opportunity } from '../../src/domain/opportunity/opportunity';

const opportunity: Opportunity = {
  id: 'OPP-TEST',
  name: 'Test Opportunity',
  priority: 'high',
  lifecycleState: 'authorization_ready',
  commercialStage: 'feasibility',
  createdAt: '2026-09-02T00:00:00Z',
  updatedAt: '2026-09-02T00:00:00Z',
};

describe('Project Authorization policy', () => {
  it('blocks authorization when material unknowns remain', () => {
    const readiness = evaluateAuthorizationReadiness(opportunity, true, [], ['Ridgewood formal role unresolved']);
    expect(readiness.ready).toBe(false);
    expect(() => assertCanAuthorizeProject(readiness, { actorPersonId: 'P1', hasProjectAuthorizationAuthority: true })).toThrow();
  });

  it('blocks an actor without authority even when readiness is complete', () => {
    const readiness = evaluateAuthorizationReadiness(opportunity, true, [], []);
    expect(() => assertCanAuthorizeProject(readiness, { actorPersonId: 'P1', hasProjectAuthorizationAuthority: false })).toThrow();
  });
});
