import { describe,it,expect } from 'vitest';
import { derivePortfolio } from '../../src/domain/project-state/portfolio';
import type { ProjectState } from '../../src/domain/project-state/projectState';
const project=(id:string,status:ProjectState['status']='active',probability?:number):ProjectState=>({id,name:id,stage:'opportunity',commercialStage:'opportunity',status,priority:'medium',probability,createdAt:'2026-09-11',updatedAt:'2026-09-11'});
describe('portfolio operational totals',()=>{
 it('excludes held and missing projects from active work, and does not turn unknown probability into zero',()=>{
  const data=derivePortfolio([project('a','active',0),project('b','active'),project('held','held',100)],[{id:'1',project_state_id:'a',title:'Due',due_date:'2026-09-10',status:'open'},{id:'2',project_state_id:'held',title:'Held',due_date:'2026-09-10',status:'open'},{id:'3',project_state_id:'a',title:'Done',due_date:'2026-09-10',status:'done'},{id:'4',project_state_id:'archived',title:'Hidden',due_date:'2026-09-10',status:'open'}],[],'2026-09-11');
  expect(data.overdue.map(a=>a.id)).toEqual(['1']);expect(data.averageProbability).toBe(0);expect(data.assessed).toBe(1);expect(data.pipeline).toHaveLength(2);
 });
 it('separates upcoming, undated and blocked actions and only counts unresolved material risks',()=>{
  const data=derivePortfolio([project('a')],[{id:'1',project_state_id:'a',title:'Today',due_date:'2026-09-11',status:'open'},{id:'2',project_state_id:'a',title:'No date',due_date:null,status:'blocked'}],[{id:'r1',project_state_id:'a',kind:'risk',severity:'high',status:'open'},{id:'r2',project_state_id:'a',kind:'risk',severity:'critical',status:'done'}],'2026-09-11');
  expect(data.overdue).toHaveLength(0);expect(data.upcoming).toHaveLength(1);expect(data.undated).toHaveLength(1);expect(data.blocked).toHaveLength(1);expect(data.materialRisks).toHaveLength(1);expect(data.averageProbability).toBeNull();
 });
});
