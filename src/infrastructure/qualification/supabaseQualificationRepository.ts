import { supabase } from '../auth/supabaseClient';

export type QualificationArea='fit'|'stakeholders'|'site'|'commercial';
export type QualificationAssessment='yes'|'unclear'|'no';
export type QualificationDecision='advance'|'hold'|'decline';
export type QualificationFinding={area:QualificationArea;assessment:QualificationAssessment;note?:string};

async function context(){const {data:{user},error}=await supabase.auth.getUser();if(error||!user)throw error??new Error('Authentication required.');const {data:m,error:me}=await supabase.from('workspace_memberships').select('workspace_id').eq('user_id',user.id).eq('status','active').limit(1).single();if(me||!m)throw me??new Error('No active Ridgewood workspace.');return{userId:user.id,workspaceId:m.workspace_id as string}}

export const supabaseQualificationRepository={
 async list(projectStateId:string):Promise<QualificationFinding[]>{await context();const {data,error}=await supabase.from('project_state_qualification_findings').select('area,assessment,note').eq('project_state_id',projectStateId);if(error)throw error;return(data??[]) as QualificationFinding[]},
 async save(projectStateId:string,finding:QualificationFinding):Promise<void>{const {userId,workspaceId}=await context();const {error}=await supabase.from('project_state_qualification_findings').upsert({workspace_id:workspaceId,project_state_id:projectStateId,area:finding.area,assessment:finding.assessment,note:finding.note??null,assessed_by:userId,assessed_at:new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:'project_state_id,area'});if(error)throw error},
 async decide(projectStateId:string,decision:QualificationDecision,rationale?:string):Promise<void>{await context();const {error}=await supabase.rpc('set_project_state_qualification_decision',{project_state_input:projectStateId,decision_input:decision,rationale_input:rationale??null});if(error)throw error}
};
