import { PREDEVELOPMENT_DOMAINS, type PredevelopmentDomain, type PredevelopmentDomainState, type ReadinessState } from '../../domain/predevelopment/predevelopment';
import { supabase } from '../auth/supabaseClient';

export async function ensurePredevelopmentDomains(opportunityId:string):Promise<void>{
  const { data:userData }=await supabase.auth.getUser(); const uid=userData.user?.id; if(!uid) throw new Error('Authentication required.');
  const rows=PREDEVELOPMENT_DOMAINS.map(domain_key=>({opportunity_id:opportunityId,domain_key,readiness:'not_started',updated_by:uid}));
  const {error}=await supabase.from('predevelopment_domains').upsert(rows,{onConflict:'opportunity_id,domain_key',ignoreDuplicates:true}); if(error) throw error;
}
export async function listPredevelopmentDomains(opportunityId:string):Promise<PredevelopmentDomainState[]>{
  const {data,error}=await supabase.from('predevelopment_domains').select('*').eq('opportunity_id',opportunityId).order('domain_key'); if(error) throw error;
  return (data??[]).map((r:any)=>({opportunityId:r.opportunity_id,domain:r.domain_key as PredevelopmentDomain,readiness:r.readiness as ReadinessState,summary:r.notes??undefined,blockers:[],unknowns:[],updatedAt:r.updated_at}));
}
export async function updatePredevelopmentDomain(opportunityId:string,domain:PredevelopmentDomain,readiness:ReadinessState,notes:string):Promise<void>{
  const {data:userData}=await supabase.auth.getUser(); const uid=userData.user?.id; if(!uid) throw new Error('Authentication required.');
  const {error}=await supabase.from('predevelopment_domains').update({readiness,notes:notes.trim()||null,updated_by:uid,updated_at:new Date().toISOString()}).eq('opportunity_id',opportunityId).eq('domain_key',domain); if(error) throw error;
}
