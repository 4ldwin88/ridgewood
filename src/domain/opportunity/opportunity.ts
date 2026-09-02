export type OpportunityLifecycleState =
  | 'potential'
  | 'qualification'
  | 'predevelopment'
  | 'authorization_ready'
  | 'authorized'
  | 'held'
  | 'declined'
  | 'lost';

export type CommercialStage =
  | 'unknown'
  | 'early'
  | 'feasibility'
  | 'proposal'
  | 'negotiation'
  | 'awarded'
  | 'lost';

export type VerificationState = 'unknown' | 'unverified' | 'verified';
export type OpportunityPriority = 'low' | 'medium' | 'high';

export interface Opportunity {
  id: string;
  projectStateId?: string;
  name: string;
  organizationId?: string;
  location?: string;
  sector?: string;
  source?: string;
  ownerPersonId?: string;
  summary?: string;
  priority: OpportunityPriority;
  lifecycleState: OpportunityLifecycleState;
  commercialStage: CommercialStage;
  probability?: number;
  nextAction?: string;
  createdAt: string;
  updatedAt: string;
}
