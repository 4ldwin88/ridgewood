export const PREDEVELOPMENT_DOMAIN_KEYS = [
  'development_site',
  'product_program',
  'design_consultants',
  'commercial_feasibility',
  'schedule_phasing',
  'risk_decision_evidence',
  'delivery_strategy',
] as const;

export type PredevelopmentDomainKey = typeof PREDEVELOPMENT_DOMAIN_KEYS[number];

export const PREDEVELOPMENT_DOMAIN_LABELS: Record<PredevelopmentDomainKey, string> = {
  development_site: 'Development & Site',
  product_program: 'Product & Program',
  design_consultants: 'Design & Consultants',
  commercial_feasibility: 'Commercial & Feasibility',
  schedule_phasing: 'Schedule & Phasing',
  risk_decision_evidence: 'Risk, Decision & Evidence',
  delivery_strategy: 'Delivery Strategy',
};
