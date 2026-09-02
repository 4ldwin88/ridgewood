export type OpportunityLifecycleState =
  | 'basic'
  | 'qualified'
  | 'predevelopment'
  | 'authorization_ready'
  | 'authorized'
  | 'held'
  | 'declined';

export type CommercialStage =
  | 'unknown'
  | 'early'
  | 'feasibility'
  | 'proposal'
  | 'negotiation'
  | 'awarded'
  | 'lost';

export type VerificationState = 'unknown' | 'unverified' | 'verified';

export interface Opportunity {
  id: string;
  name: string;
  organizationId?: string;
  location?: string;
  sector?: string;
  source?: string;
  ownerPersonId?: string;
  summary?: string;
  priority: 'low' | 'medium' | 'high';
  lifecycleState: OpportunityLifecycleState;
  commercialStage: CommercialStage;
  probability?: number;
  nextAction?: string;
  createdAt: string;
  updatedAt: string;
}
