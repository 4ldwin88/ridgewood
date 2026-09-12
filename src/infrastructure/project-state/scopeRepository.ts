import { supabase } from '../auth/supabaseClient';
import type { ScopeItem } from '../../domain/project-state/scope';
export interface ScopeSource {id:string;label:string;category:string;state:string;snapshot:Record<string,unknown>;documentId:string;documentType:string;revisionNumber:number;publishedAt:string;publishedBy:string}
export interface ScopeState {
 projectStateId:string;version:number;items:ScopeItem[];authorizationRecordId:string|null;approvedBaselineId:null;canEdit:boolean;blockers:string[];
 parties:{id:string;label:string;retired:boolean}[];sources:ScopeSource[];
 requests:{id:string;version:number;createdAt:string;status:'pending'|'superseded'}[];
 history:{version:number;createdAt:string;items:ScopeItem[]}[];savedVersion?:number;submittedVersion?:number;
}
export class ScopeCommandError extends Error {constructor(message:string,public code:string){super(message);}}
export const scopeRepository={
 async read(projectStateId:string):Promise<ScopeState>{const {data,error}=await supabase.rpc('read_project_scope',{project_state_input:projectStateId});if(error)throw new ScopeCommandError(error.message,error.code);return data;},
 async save(projectStateId:string,version:number,id:string,items:ScopeItem[]):Promise<ScopeState>{const {data,error}=await supabase.rpc('save_project_scope',{project_state_input:projectStateId,expected_version_input:version,request_id_input:id,items_input:items});if(error)throw new ScopeCommandError(error.message,error.code);return data;},
 async request(projectStateId:string,version:number,id:string):Promise<ScopeState>{const {data,error}=await supabase.rpc('request_project_scope_review',{project_state_input:projectStateId,version_input:version,request_id_input:id});if(error)throw new ScopeCommandError(error.message,error.code);return data;},
};
