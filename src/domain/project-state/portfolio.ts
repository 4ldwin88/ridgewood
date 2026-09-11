import type { ProjectState } from './projectState';
export const businessStages=['opportunity','qualification','predevelopment','authorization'];
export type PortfolioAction={id:string;project_state_id:string;title:string;due_date:string|null;status:string};
export type PortfolioRisk={id:string;project_state_id:string;kind:string;severity:string|null;status:string};
export function derivePortfolio(projects:ProjectState[],actions:PortfolioAction[],risks:PortfolioRisk[],today:string){
  const active=projects.filter(p=>p.status==='active');const ids=new Set(active.map(p=>p.id));
  const work=actions.filter(a=>ids.has(a.project_state_id)&&!['done','cancelled'].includes(a.status));
  const openRisks=risks.filter(r=>ids.has(r.project_state_id)&&!['done','cancelled'].includes(r.status));
  const end=new Date(`${today}T12:00:00Z`);end.setUTCDate(end.getUTCDate()+7);const week=end.toISOString().slice(0,10);
  const pipeline=active.filter(p=>businessStages.includes(p.stage));
  const assessed=pipeline.filter(p=>p.probability!==undefined);
  return {active,pipeline,authorized:active.filter(p=>!businessStages.includes(p.stage)),held:projects.filter(p=>p.status==='held'),
    assessed:assessed.length,averageProbability:assessed.length?Math.round(assessed.reduce((n,p)=>n+p.probability!,0)/assessed.length):null,
    overdue:work.filter(a=>a.due_date&&a.due_date<today),upcoming:work.filter(a=>a.due_date&&a.due_date>=today&&a.due_date<=week).sort((a,b)=>(a.due_date??'').localeCompare(b.due_date??'')),
    blocked:work.filter(a=>a.status==='blocked'),undated:work.filter(a=>!a.due_date),openRisks,
    materialRisks:openRisks.filter(r=>['high','critical','material'].includes((r.severity??'').toLowerCase())),
    unassessedRisks:openRisks.filter(r=>!r.severity),unassigned:active.filter(p=>!p.ownerPersonId),
    sectors:active.filter(p=>p.sector).length,sources:pipeline.filter(p=>p.source).length};
}
