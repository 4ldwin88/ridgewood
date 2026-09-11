import { supabase } from '../auth/supabaseClient';
import { supabaseProjectStateRepository } from './supabaseProjectStateRepository';
import type { PortfolioAction,PortfolioRisk } from '../../domain/project-state/portfolio';

export async function loadPortfolio(){
  const projects=await supabaseProjectStateRepository.listPortfolio();
  const actions:PortfolioAction[]=[],risks:PortfolioRisk[]=[];
  // Paginate related records; do not silently turn the Data API row cap into portfolio totals.
  for(let offset=0;offset<projects.length;offset+=100){const ids=projects.slice(offset,offset+100).map(p=>p.id);
    for(let page=0;;page+=1000){const {data,error}=await supabase.from('actions').select('id,project_state_id,title,due_date,status').in('project_state_id',ids).order('id').range(page,page+999);if(error)throw error;actions.push(...(data??[]) as PortfolioAction[]);if((data?.length??0)<1000)break;}
    for(let page=0;;page+=1000){const {data,error}=await supabase.from('risk_issues').select('id,project_state_id,kind,severity,status').in('project_state_id',ids).order('id').range(page,page+999);if(error)throw error;risks.push(...(data??[]) as PortfolioRisk[]);if((data?.length??0)<1000)break;}
  }
  return {projects,actions,risks};
}
