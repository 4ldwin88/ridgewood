import { describe, expect, it } from 'vitest';
import { assertCanAuthorizeProject, evaluateAuthorizationReadiness } from '../../src/application/policies/projectAuthorization';
import type { ProjectState } from '../../src/domain/project-state/projectState';

const projectState: ProjectState = {
  id: 'PS-TEST',
  name: 'Test Project State',
  priority: 'high',
  stage: 'predevelopment',
  status: 'active',
  commercialStage: 'predevelopment',
  createdAt: '2026-09-02T00:00:00Z',
  updatedAt: '2026-09-02T00:00:00Z',
};

describe('Project Authorization policy', () => {
  it('blocks authorization when material unknowns remain', () => {
    const readiness = evaluateAuthorizationReadiness(projectState, true, [], ['Ridgewood formal role unresolved']);
    expect(readiness.ready).toBe(false);
    expect(() => assertCanAuthorizeProject(readiness, { actorPersonId: 'P1', hasProjectAuthorizationAuthority: true })).toThrow();
  });

  it('blocks an actor without authority even when readiness is complete', () => {
    const readiness = evaluateAuthorizationReadiness(projectState, true, [], []);
    expect(readiness.ready).toBe(true);
    expect(() => assertCanAuthorizeProject(readiness, { actorPersonId: 'P1', hasProjectAuthorizationAuthority: false })).toThrow();
  });

  it('blocks authorization while the Project State is held', () => {
    const readiness = evaluateAuthorizationReadiness({ ...projectState, status: 'held' }, true, [], []);
    expect(readiness.ready).toBe(false);
  });
});
