import type { ProjectState } from '../../domain/project-state/projectState';
import { listPredevelopmentDomains } from '../../infrastructure/predevelopment/supabasePredevelopmentRepository';
import { type QualificationDecision, type QualificationFinding } from '../../infrastructure/qualification/supabaseQualificationRepository';
import { QualificationReviewWorkspace } from './QualificationReviewWorkspace';

export function QualificationReviewIntegration({
  item,
  findings,
  preauthorization,
  onFindingsChanged,
  onDecision,
  onDownstreamReassessment,
}: {
  item: ProjectState;
  findings: QualificationFinding[];
  preauthorization: boolean;
  onFindingsChanged: (findings: QualificationFinding[]) => void;
  onDecision: (decision: QualificationDecision, rationale?: string) => Promise<void>;
  onDownstreamReassessment: (domains: Awaited<ReturnType<typeof listPredevelopmentDomains>>) => void;
}) {
  return <QualificationReviewWorkspace
    projectStateId={item.id}
    findings={findings}
    currentStage={item.stage}
    preauthorization={preauthorization}
    onFindingsChanged={onFindingsChanged}
    onDecision={onDecision}
    onDownstreamReassessment={async () => {
      if (item.stage === 'predevelopment' || item.stage === 'authorization') {
        onDownstreamReassessment(await listPredevelopmentDomains(item.id));
      }
    }}
  />;
}
