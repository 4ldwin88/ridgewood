import { supabase } from '../auth/supabaseClient';
export interface ContractData {
 partyIds: string[]; agreementRevisionId: string; agreementEvidenceId: string;
 compensationModel: '' | 'fixed' | 'fee' | 'mixed'; contractValue: string; currency: string; feeBasis: string; paymentTerms: string;
 reviewDecisionId: string; riskAssessment: '' | 'none_identified' | 'linked'; riskIds: string[]; effectiveFrom: string; effectiveUntil: string;
}
export const blankContract = (): ContractData => ({partyIds:[],agreementRevisionId:'',agreementEvidenceId:'',compensationModel:'',contractValue:'',currency:'',feeBasis:'',paymentTerms:'',reviewDecisionId:'',riskAssessment:'',riskIds:[],effectiveFrom:'',effectiveUntil:''});
export interface ContractOption { id: string; label: string; retired?: boolean }
export interface ContractState {
 projectStateId: string; version: number; savedVersion?: number; data: ContractData | null; authorizationRecordId: string | null;
 canEdit: boolean; status: 'preparation'; approvalVerified: false;
 parties: ContractOption[]; agreements: ContractOption[]; evidence: ContractOption[]; risks: ContractOption[]; decisions: ContractOption[];
 history: { version: number; actorUserId: string; createdAt: string }[];
 reviewRequests?: { id: string; version: number; actorUserId: string; createdAt: string; status: 'pending' | 'superseded' }[];
 submittedReviewId?: string; submittedVersion?: number;
}
export class ContractSaveError extends Error {
 code: string;
 constructor(message:string,code:string){super(message);this.code=code;}
}
export const contractRepository = {
 async requestReview(projectStateId: string, version: number, requestId: string): Promise<ContractState> {
  const {data,error}=await supabase.rpc('request_project_contract_review',{project_state_input:projectStateId,version_input:version,request_id_input:requestId});
  if(error)throw new ContractSaveError(error.message,error.code);return data as ContractState;
 },
 async read(projectStateId: string): Promise<ContractState> {
  const {data,error}=await supabase.rpc('read_project_contract',{project_state_input:projectStateId});
  if(error)throw new Error(error.message);return data as ContractState;
 },
 async save(projectStateId:string,version:number,requestId:string,values:ContractData):Promise<ContractState>{
  const {data,error}=await supabase.rpc('save_project_contract',{project_state_input:projectStateId,expected_version_input:version,request_id_input:requestId,data_input:values});
  if(error)throw new ContractSaveError(error.message,error.code);return data as ContractState;
 },
};
