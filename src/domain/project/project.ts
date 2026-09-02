export interface AuthorizationReadiness {
  opportunityId: string;
  ready: boolean;
  blockers: string[];
  unknowns: string[];
}

export interface AuthorizationRecord {
  id: string;
  opportunityId: string;
  actorPersonId: string;
  authorityBasis: string;
  decision: 'authorized' | 'returned' | 'held';
  rationale?: string;
  evidenceReferenceIds: string[];
  createdAt: string;
}

export interface Project {
  id: string;
  originatingOpportunityId: string;
  name: string;
  organizationId?: string;
  location?: string;
  establishedAt: string;
  authorizationRecordId: string;
}
