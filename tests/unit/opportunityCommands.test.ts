import { describe, expect, it } from 'vitest';
import { beginPredevelopment, recordQualificationDecision } from '../../src/application/commands/opportunityCommands';
import type { Opportunity } from '../../src/domain/opportunity/opportunity';

const base: Opportunity = {
  id: 'OPP-FAIRY-LAKE',
  name: 'Fairy Lake / STANZA',
  priority: 'high',
  lifecycleState: 'basic',
  commercialStage: 'unknown',
  createdAt: '2026-09-02T00:00:00.000Z',
  updatedAt: '2026-09-02T00:00:00.000Z',
};

describe('Opportunity lifecycle commands', () => {
  it('advances qualification through a named command and emits audit material', () => {
    const result = recordQualificationDecision(base, {
      outcome: 'advance', rationale: 'Proceed to structured predevelopment.',
      decidedBy: 'edward', decidedAt: '2026-09-02T01:00:00.000Z',
    });
    expect(result.opportunity.lifecycleState).toBe('qualified');
    expect(result.event.type).toBe('qualification_decided');
  });

  it('does not permit predevelopment before qualification', () => {
    expect(() => beginPredevelopment(base, 'edward')).toThrow(/qualified Opportunity/);
  });

  it('permits explicit hold without inventing missing facts', () => {
    const result = recordQualificationDecision(base, {
      outcome: 'hold', rationale: 'Ridgewood mandate remains unverified.',
      decidedBy: 'edward', decidedAt: '2026-09-02T01:00:00.000Z',
    });
    expect(result.opportunity.lifecycleState).toBe('held');
  });
});
