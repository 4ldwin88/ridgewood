export const PREDEVELOPMENT_DOMAINS = [
  'development_site',
  'product_program',
  'design_consultants',
  'commercial_feasibility',
  'schedule_phasing',
  'risk_decision_evidence',
  'delivery_strategy',
] as const;

export type PredevelopmentDomain = (typeof PREDEVELOPMENT_DOMAINS)[number];
export type ReadinessState = 'not_started' | 'in_progress' | 'satisfied' | 'blocked' | 'unknown';

export interface PredevelopmentDomainState {
  projectStateId: string;
  domain: PredevelopmentDomain;
  readiness: ReadinessState;
  summary?: string;
  blockers: string[];
  unknowns: string[];
  updatedAt: string;
}
