export type ProjectStage =
  | 'opportunity'
  | 'qualification'
  | 'predevelopment'
  | 'authorization'
  | 'project_authorization_setup'
  | 'preconstruction_mobilization'
  | 'construction_control'
  | 'completion_turnover'
  | 'project_closeout'
  | 'warranty_final_close'
  | 'closed';

export type ProjectStateStatus =
  | 'active'
  | 'held'
  | 'declined'
  | 'lost'
  | 'cancelled'
  | 'terminated'
  | 'closed';

/**
 * Commercial context is intentionally independent from Project State lifecycle.
 * The database currently stores the canonical lifecycle-compatible values below;
 * this field may later be replaced by richer Commercial module records.
 */
export type CommercialStage =
  | 'opportunity'
  | 'qualification'
  | 'predevelopment'
  | 'authorization'
  | 'project_authorization_setup'
  | 'preconstruction_mobilization'
  | 'construction_control'
  | 'completion_turnover'
  | 'project_closeout'
  | 'warranty_final_close'
  | 'closed';

export type ProjectPriority = 'low' | 'medium' | 'high';

export interface ProjectState {
  id: string;
  name: string;
  organizationId?: string;
  location?: string;
  sector?: string;
  source?: string;
  ownerPersonId?: string;
  summary?: string;
  priority: ProjectPriority;
  stage: ProjectStage;
  status: ProjectStateStatus;
  commercialStage: CommercialStage;
  probability?: number;
  nextAction?: string;
  createdAt: string;
  updatedAt: string;
}

export const PROJECT_STAGE_ORDER: ProjectStage[] = [
  'opportunity',
  'qualification',
  'predevelopment',
  'authorization',
  'project_authorization_setup',
  'preconstruction_mobilization',
  'construction_control',
  'completion_turnover',
  'project_closeout',
  'warranty_final_close',
  'closed',
];

const PROJECT_STAGE_LABELS: Record<ProjectStage, string> = {
  opportunity: 'Opportunity',
  qualification: 'Qualification',
  predevelopment: 'Predevelopment',
  authorization: 'Authorization',
  project_authorization_setup: 'Project Authorization & Setup',
  preconstruction_mobilization: 'Pre-Construction & Mobilization',
  construction_control: 'Construction & Control',
  completion_turnover: 'Completion & Turnover',
  project_closeout: 'Project Closeout',
  warranty_final_close: 'Warranty & Final Close',
  closed: 'Closed',
};

export function projectStageLabel(stage: ProjectStage): string {
  return PROJECT_STAGE_LABELS[stage];
}

export function isSuccessfulTerminalProjectState(project: ProjectState): boolean {
  return project.stage === 'closed' && project.status === 'closed';
}
