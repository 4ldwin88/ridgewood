begin;
select plan(5);
insert into auth.users(id,instance_id,aud,role,email,created_at,updated_at) values
('00000000-0000-4000-8000-00000000f001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','form-owner@example.invalid',now(),now()),
('00000000-0000-4000-8000-00000000f002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','form-outsider@example.invalid',now(),now());
insert into public.workspaces(id,name,created_by) values
('00000000-0000-4000-8000-00000000f010','Synthetic form contract','00000000-0000-4000-8000-00000000f001');
insert into public.workspace_memberships(workspace_id,user_id,technical_role,status) values
('00000000-0000-4000-8000-00000000f010','00000000-0000-4000-8000-00000000f001','owner','active');
insert into public.user_permission_overrides(workspace_id,user_id,permission_key,effect,assigned_by)
select '00000000-0000-4000-8000-00000000f010','00000000-0000-4000-8000-00000000f001',p,'grant','00000000-0000-4000-8000-00000000f001'
from unnest(array['document.create_draft','document.publish','document.create_revision']) p;
insert into public.project_states(id,workspace_id,name,stage,commercial_stage,status,priority,created_by,owner_user_id) values
('00000000-0000-4000-8000-00000000f020','00000000-0000-4000-8000-00000000f010','Synthetic site','predevelopment','predevelopment','active','medium','00000000-0000-4000-8000-00000000f001','00000000-0000-4000-8000-00000000f001');

update public.project_states set stage='qualification',commercial_stage='qualification' where id='00000000-0000-4000-8000-00000000f020';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-00000000f001","role":"authenticated"}',true);
select throws_ok($$update public.project_state_qualification_findings set assessment='yes'$$,'42501',null,'direct findings update is denied');
select lives_ok($$select public.record_project_state_qualification_finding('00000000-0000-4000-8000-00000000f020',area,'yes','Synthetic grant regression') from unnest(array['opportunity_credibility','strategic_fit','relationship_authority','commercial_plausibility','execution_risk']) area$$,'governed finding RPC writes all five assessments');
select is((select count(*)::integer from public.project_state_qualification_findings where project_state_id='00000000-0000-4000-8000-00000000f020'),5,'authenticated readback sees persisted findings');
select lives_ok($$select public.set_project_state_stage_requirement('00000000-0000-4000-8000-00000000f020','qualification','grant_probe','Synthetic requirement','satisfied',false)$$,'stage requirement invoker RPC remains writable');
select lives_ok($$select public.set_project_state_qualification_decision('00000000-0000-4000-8000-00000000f020','advance','Synthetic grant regression')$$,'qualification decision advances through governed command');
reset role;
select * from finish();
rollback;
