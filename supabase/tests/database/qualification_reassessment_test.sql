begin;
create temporary table reassessment_results(result text);
grant all on reassessment_results to authenticated;
insert into reassessment_results select plan(13);
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


insert into public.project_states(id,workspace_id,name,stage,commercial_stage,status,priority,created_by,owner_user_id)
values ('00000000-0000-4000-8000-00000000f021','00000000-0000-4000-8000-00000000f010','Other project','predevelopment','predevelopment','active','medium','00000000-0000-4000-8000-00000000f001','00000000-0000-4000-8000-00000000f001');
insert into public.predevelopment_domains(project_state_id,domain_key,readiness,updated_by) values
('00000000-0000-4000-8000-00000000f020','development_site','satisfied','00000000-0000-4000-8000-00000000f002'),
('00000000-0000-4000-8000-00000000f020','product_program','not_started','00000000-0000-4000-8000-00000000f002'),
('00000000-0000-4000-8000-00000000f021','development_site','satisfied','00000000-0000-4000-8000-00000000f002');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-00000000f001","role":"authenticated"}',true);
insert into reassessment_results select lives_ok($$select public.record_project_state_qualification_finding('00000000-0000-4000-8000-00000000f020','strategic_fit','no','Changed evidence')$$,'predevelopment reassessment saves');
insert into reassessment_results select is((select assessment from public.project_state_qualification_findings where project_state_id='00000000-0000-4000-8000-00000000f020' and area='strategic_fit'),'no','assessment persists');
insert into reassessment_results select is((select readiness::text from public.predevelopment_domains where project_state_id='00000000-0000-4000-8000-00000000f020' and domain_key='development_site'),'in_progress','prior readiness requires reassessment');
insert into reassessment_results select is((select readiness::text from public.predevelopment_domains where project_state_id='00000000-0000-4000-8000-00000000f020' and domain_key='product_program'),'not_started','unstarted domain remains unstarted');
insert into reassessment_results select is((select updated_by::text from public.predevelopment_domains where project_state_id='00000000-0000-4000-8000-00000000f020' and domain_key='development_site'),'00000000-0000-4000-8000-00000000f001','readiness update identifies its actor');
insert into reassessment_results select is((select readiness::text from public.predevelopment_domains where project_state_id='00000000-0000-4000-8000-00000000f021' and domain_key='development_site'),'satisfied','another project readiness is unchanged');
reset role;
update public.predevelopment_domains set readiness='satisfied' where project_state_id='00000000-0000-4000-8000-00000000f020' and domain_key='development_site';
set local role authenticated;
insert into reassessment_results select lives_ok($$select public.record_project_state_qualification_finding('00000000-0000-4000-8000-00000000f020','strategic_fit','no','Note clarification')$$,'same assessment permits note edit');
insert into reassessment_results select is((select readiness::text from public.predevelopment_domains where project_state_id='00000000-0000-4000-8000-00000000f020' and domain_key='development_site'),'satisfied','note-only edit does not invalidate readiness');
reset role;
update public.project_states set stage='authorization',commercial_stage='authorization' where id='00000000-0000-4000-8000-00000000f020';
set local role authenticated;
insert into reassessment_results select lives_ok($$select public.record_project_state_qualification_finding('00000000-0000-4000-8000-00000000f020','strategic_fit','yes','New evidence')$$,'authorization-stage reassessment saves');
insert into reassessment_results select is((select readiness::text from public.predevelopment_domains where project_state_id='00000000-0000-4000-8000-00000000f020' and domain_key='development_site'),'in_progress','authorization-stage readiness requires reassessment');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-00000000f002","role":"authenticated"}',true);
insert into reassessment_results select throws_ok($$select public.record_project_state_qualification_finding('00000000-0000-4000-8000-00000000f020','strategic_fit','no','Denied')$$,'P0001','workspace_access_denied','outsider reassessment denied');
reset role;
update public.project_states set stage='project_authorization_setup' where id='00000000-0000-4000-8000-00000000f020';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-00000000f001","role":"authenticated"}',true);
insert into reassessment_results select throws_ok($$select public.record_project_state_qualification_finding('00000000-0000-4000-8000-00000000f020','strategic_fit','no','Denied')$$,'P0001','qualification_finding_not_allowed_from_stage:project_authorization_setup','post-authorization freeze remains enforced');
reset role;
update public.project_states set stage='predevelopment',status='held' where id='00000000-0000-4000-8000-00000000f020';
set local role authenticated;
insert into reassessment_results select throws_ok($$select public.record_project_state_qualification_finding('00000000-0000-4000-8000-00000000f020','strategic_fit','no','Denied')$$,'P0001','qualification_finding_not_allowed_for_status:held','held project reassessment denied');
reset role;
insert into reassessment_results select * from finish();
select jsonb_agg(result) as test_results from reassessment_results;
rollback;
