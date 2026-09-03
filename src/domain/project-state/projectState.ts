export type ProjectStage =
  | 'opportunity'
  | 'qualification'
  | 'predevelopment'
  | 'authorization'
  | 'authorized';

export type ProjectStateStatus = 'active' | 'held' | 'declined' | 'lost';
export type CommercialStage = 'unknown' | 'early' | 'feasibility' | 'proposal' | 'negotiation' | 'awarded' | 'lost';
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

export const PROJECT_STAGE_ORDER: ProjectStage[] = ['opportunity', 'qualification', 'predevelopment', 'authorization', 'authorized'];

export function projectStageLabel(stage: ProjectStage): string {
  return stage === 'authorized' ? 'Authorized Project' : stage[0].toUpperCase() + stage.slice(1);
}
