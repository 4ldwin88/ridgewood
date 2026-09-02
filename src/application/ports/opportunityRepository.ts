import type { Opportunity } from '../../domain/opportunity/opportunity';

export interface OpportunityRepository {
  create(opportunity: Opportunity): Promise<Opportunity>;
  getById(id: string): Promise<Opportunity | null>;
  save(opportunity: Opportunity): Promise<Opportunity>;
  list(): Promise<Opportunity[]>;
}
