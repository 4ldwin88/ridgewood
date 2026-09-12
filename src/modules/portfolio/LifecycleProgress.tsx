import { PROJECT_STAGE_ORDER, projectStageLabel, type ProjectState } from '../../domain/project-state/projectState';
export function LifecycleProgress({project}:{project:ProjectState}) {
 const index=PROJECT_STAGE_ORDER.indexOf(project.stage);
 const stages=index<4?PROJECT_STAGE_ORDER.slice(0,4):PROJECT_STAGE_ORDER.slice(4);
 const position=stages.indexOf(project.stage)+1;
 return <div className="card-stage-progress" aria-label={`${projectStageLabel(project.stage)}, stage ${position} of ${stages.length}. Lifecycle position, not work completion.`}><div><span>{projectStageLabel(project.stage)}</span><small>Stage {position} of {stages.length}</small></div><div className="card-stage-progress__track">{stages.map((stage,i)=><span key={stage} className={i<position?'reached':''}/>)}</div></div>;
}
