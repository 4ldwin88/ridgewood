import { beginPredevelopment } from '../commands/opportunityCommands';
import type { AuditRepository } from '../ports/auditRepository';
import type { OpportunityRepository } from '../ports/opportunityRepository';

export class StartPredevelopment {
  constructor(
    private readonly opportunities: OpportunityRepository,
    private readonly audit: AuditRepository,
  ) {}

  async execute(opportunityId: string, actorId: string, occurredAt?: string) {
    const current = await this.opportunities.getById(opportunityId);
    if (!current) throw new Error('Opportunity not found.');

    const result = beginPredevelopment(current, actorId, occurredAt);
    const saved = await this.opportunities.save(result.opportunity);
    await this.audit.append(result.event);
    return saved;
  }
}
