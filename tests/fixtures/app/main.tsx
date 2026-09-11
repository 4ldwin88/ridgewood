// Isolated visual fixture, excluded from the production entry graph.
// No hosted request is sent and no successful write response is simulated.
import { createRoot } from 'react-dom/client';
import type { Session, User } from '@supabase/supabase-js';
import type { ProjectState } from '../../../src/domain/project-state/projectState';
import '../../../src/styles/global.css';
import '../../../src/styles.css';
import '../../../src/styles/os-app.css';
import '../../../src/styles/os-portfolio.css';
const originalFetch=window.fetch.bind(window);
window.fetch=async(input,init)=>{
 const url=new URL(input instanceof Request?input.url:String(input),location.href);
 if(url.origin===location.origin)return originalFetch(input,init);
 if(url.pathname.includes('/storage/v1/object/list/'))return new Response('[]',{headers:{'content-type':'application/json'}});
 if(url.pathname.includes('/storage/v1/'))return new Response(JSON.stringify({statusCode:'404',error:'not_found',message:'No photo in isolated fixture'}),{status:404,headers:{'content-type':'application/json'}});
 const method=init?.method??(input instanceof Request?input.method:'GET');
 if(method==='GET'||url.pathname.endsWith('/ensure_project_state_predevelopment_domains'))return new Response('[]',{headers:{'content-type':'application/json'}});
 throw new Error('Isolated visual fixture: writes are disabled.');
};
const {supabase}=await import('../../../src/infrastructure/auth/supabaseClient');
const {supabaseProjectStateRepository:repository}=await import('../../../src/infrastructure/project-state/supabaseProjectStateRepository');
const {supabaseQualificationRepository:qualification}=await import('../../../src/infrastructure/qualification/supabaseQualificationRepository');
const user={id:'00000000-0000-4000-8000-000000000001',email:'visual-fixture@example.invalid',aud:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-09-11T12:00:00Z'} satisfies User;
supabase.auth.getUser=async()=>({data:{user},error:null});
const items:ProjectState[]=[
 {id:'visual-1',name:'Harbour House · Synthetic',location:'Example waterfront site',sector:'Residential',priority:'high',stage:'predevelopment',status:'active',commercialStage:'predevelopment',probability:65,createdAt:'2026-09-11T10:00:00Z',updatedAt:'2026-09-11T12:00:00Z'},
 {id:'visual-2',name:'Foundry Studios · Synthetic',location:'Example commercial interior',sector:'Commercial',priority:'medium',stage:'opportunity',status:'active',commercialStage:'opportunity',createdAt:'2026-09-11T10:00:00Z',updatedAt:'2026-09-11T12:00:00Z'},
 {id:'visual-3',name:'Maple Court · Synthetic',location:'Example residential development',sector:'Residential',priority:'medium',stage:'qualification',status:'active',commercialStage:'qualification',probability:40,createdAt:'2026-09-11T10:00:00Z',updatedAt:'2026-09-11T12:00:00Z'},
];
repository.listPortfolio=async()=>items;
repository.get=async(id)=>items.find(p=>p.id===id)!;
repository.list=async(view)=>view&&view!=='pipeline'?[]:items;
repository.organizations=async()=>[];
repository.workspaceMembers=async()=>[{userId:user.id,label:'Test owner'}];
repository.reassessmentRequirements=async()=>[];
repository.opportunityRequirements=async()=>[{requirementKey:'context',label:'Project context captured',status:'satisfied',required:true},{requirementKey:'action',label:'Next step identified',status:'not_started',required:true}];
repository.listProjects=async()=>[];
repository.listArchivedPreauthorization=async()=>[];
qualification.list=async()=>[];
const {AppShell}=await import('../../../src/app/shell/AppShell');
const session={user,access_token:'synthetic-not-a-credential',refresh_token:'synthetic-not-a-credential',expires_in:3600,token_type:'bearer'} satisfies Session;
createRoot(document.getElementById('root')!).render(<><div style={{background:'#fff3d6',padding:'8px 20px',fontSize:12}}>Isolated visual fixture · synthetic records · no database writes</div><AppShell session={session}/></>);
