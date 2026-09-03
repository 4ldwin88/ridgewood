export interface AuthorizationReadiness {
  projectStateId: string;
  ready: boolean;
  blockers: string[];
  unknowns: string[];
}

export interface AuthorizationRecord {
  id: string;
  projectStateId: string;
  actorPersonId: string;
  authorityBasis: string;
  decision: 'authorized' | 'returned' | 'held';
  rationale?: string;
  evidenceReferenceIds: string[];
  createdAt: string;
}
