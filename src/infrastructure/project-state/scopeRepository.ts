import { supabase } from '../auth/supabaseClient';
import type { ScopeItem } from '../../domain/project-state/scope';
export interface ScopeSource {id:string;label:string;category:string;state:string;snapshot:Record<string,unknown>;documentId:string;documentType:string;revisionNumber:number;publishedAt:string;publishedBy:string}
export type ScopeOutcome='approved'|'held'|'rejected';
export interface ScopeConfirmations {withinAuthorizedBasis:boolean;boundariesReviewed:boolean;noUnresolvedScopeBlockers:boolean}
export interface ScopeDecisionInput {id:string;version:number;sequence:number;authorityId:string;outcome:ScopeOutcome;rationale:string;confirmations:ScopeConfirmations}
export interface ScopeQueryData {scopeItemId:string;question:string;identifiedOn:string;ownerUserId:string;sourceRevisionId:string;partyIds:string[]}
export interface ScopeQueryResponseInput {id:string;queryId:string;outcome:'clarification'|'potential_change';response:string;authorityId:string|null;noImpact:boolean}
export interface ScopeState {
 queryOwners:{id:string;label:string}[];
 queries:{id:string;version:number;data:ScopeQueryData;createdAt:string;actorUserId:string;sourceSnapshot:{documentId:string;documentType:string;category:string;publishedAt:string;publishedBy:string;title:string;revisionNumber:number;revisionId:string;payload:Record<string,unknown>};response:{id:string;outcome:'clarification'|'potential_change';text:string;actorUserId:string;createdAt:string;authorityReference:string|null;changeId:string|null}|null}[];
 status:string;approvalVerified:boolean;reviewSequence:number;approvalBlockers:string[];
 reviewAccess:{hasPermission:boolean;strongSession:boolean;ownerAuthorities:{id:string;reference:string}[]};
 baseline:{id:string;version:number;decisionId:string;createdAt:string;items:ScopeItem[];authorizationRecordId:string}|null;
 reviewDecisions:{id:string;version:number;sequence:number;outcome:ScopeOutcome;rationale:string;actorUserId:string;createdAt:string;authorityReference:string;contractDecisionId:string|null}[];
 projectStateId:string;version:number;items:ScopeItem[];authorizationRecordId:string|null;approvedBaselineId:string|null;canEdit:boolean;blockers:string[];
 parties:{id:string;label:string;retired:boolean}[];sources:ScopeSource[];
 requests:{id:string;version:number;createdAt:string;status:'pending'|'superseded'|'reviewed'}[];
 history:{version:number;createdAt:string;items:ScopeItem[]}[];savedVersion?:number;submittedVersion?:number;
}
export class ScopeCommandError extends Error {constructor(message:string,public code:string){super(message);}}
export const scopeRepository={
 async captureQuery(projectStateId:string,version:number,id:string,dataInput:ScopeQueryData):Promise<ScopeState>{const {data,error}=await supabase.rpc('capture_project_scope_query',{project_state_input:projectStateId,version_input:version,request_id_input:id,data_input:dataInput});if(error)throw new ScopeCommandError(error.message,error.code);return data;},
 async respondQuery(projectStateId:string,input:ScopeQueryResponseInput):Promise<ScopeState>{const {data,error}=await supabase.rpc('respond_project_scope_query',{project_state_input:projectStateId,query_id_input:input.queryId,request_id_input:input.id,outcome_input:input.outcome,response_input:input.response,authority_id_input:input.authorityId,no_impact_input:input.noImpact});if(error)throw new ScopeCommandError(error.message,error.code);return data;},
 async decide(projectStateId:string,input:ScopeDecisionInput):Promise<ScopeState>{const {data,error}=await supabase.rpc('decide_project_scope_review',{project_state_input:projectStateId,version_input:input.version,sequence_input:input.sequence,request_id_input:input.id,authority_id_input:input.authorityId,outcome_input:input.outcome,rationale_input:input.rationale,confirmations_input:input.confirmations});if(error)throw new ScopeCommandError(error.message,error.code);return data;},
 async read(projectStateId:string):Promise<ScopeState>{const {data,error}=await supabase.rpc('read_project_scope',{project_state_input:projectStateId});if(error)throw new ScopeCommandError(error.message,error.code);return data;},
 async save(projectStateId:string,version:number,id:string,items:ScopeItem[]):Promise<ScopeState>{const {data,error}=await supabase.rpc('save_project_scope',{project_state_input:projectStateId,expected_version_input:version,request_id_input:id,items_input:items});if(error)throw new ScopeCommandError(error.message,error.code);return data;},
 async request(projectStateId:string,version:number,id:string):Promise<ScopeState>{const {data,error}=await supabase.rpc('request_project_scope_review',{project_state_input:projectStateId,version_input:version,request_id_input:id});if(error)throw new ScopeCommandError(error.message,error.code);return data;},
};
