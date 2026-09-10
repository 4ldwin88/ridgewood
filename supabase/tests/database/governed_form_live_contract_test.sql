-- Run after the publication guard migration. All fixtures and writes roll back.
begin;
set local lock_timeout = '3s';
set local statement_timeout = '30s';
create temporary table form_results (result text);
grant all on form_results to authenticated;
insert into form_results select plan(12);
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
create temporary table form_ids (first_id uuid, second_id uuid);
grant all on form_ids to authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-00000000f001","role":"authenticated"}',true);
insert into form_ids(first_id) select public.create_project_state_document_draft('00000000-0000-4000-8000-00000000f020','predevelopment','development_site','predevelopment_development_site','Development & Site Review','{"siteIdentity":"Original site","siteControl":"Owned","planningStatus":"Conforming / permitted","approvalStatus":"Not assessed","accessStatus":"Suitable","_presentation":{"version":1,"title":"Original title","projectName":"Original project","fields":[]}}');
insert into form_results select lives_ok(format('select public.publish_project_state_document_revision(%L::uuid)',first_id),'publish through authenticated RPC') from form_ids;
insert into form_results select ok(r.published_source_snapshot=r.source_data,'publication freezes exact payload and presentation') from public.document_revisions r join form_ids f on r.id=f.first_id;
insert into form_results select throws_ok(format('select public.update_project_state_document_draft(%L::uuid,''{}'')',first_id),'P0001','draft_not_found_or_not_editable','published revision is not editable by draft RPC') from form_ids;
update form_ids set second_id=public.create_project_state_document_revision(first_id);
select public.update_project_state_document_draft(second_id,'{"siteIdentity":"Changed site","siteControl":"Client controlled","planningStatus":"Unknown","approvalStatus":"Not assessed","accessStatus":"Suitable"}') from form_ids;
insert into form_results select is(r.published_source_snapshot->>'siteIdentity','Original site','editing new draft preserves original evidence') from public.document_revisions r join form_ids f on r.id=f.first_id;
insert into form_results select throws_ok(format('select public.publish_project_state_document_revision(%L::uuid)',second_id),'P0001','change_note_required','second publication requires change note') from form_ids;
insert into form_results select lives_ok(format('select public.publish_project_state_document_revision(%L::uuid,''Updated site control'')',second_id),'second publication can supersede first') from form_ids;
insert into form_results select is(r.state::text,'superseded','prior revision is superseded') from public.document_revisions r join form_ids f on r.id=f.first_id;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-00000000f002","role":"authenticated"}',true);
insert into form_results select is((select count(*) from public.document_revisions where id in (select first_id from form_ids union all select second_id from form_ids)),0::bigint,'outsider cannot read either revision');
insert into form_results select throws_ok(format('select public.create_project_state_document_revision(%L::uuid)',second_id),'P0001','workspace_access_denied','outsider cannot create a revision') from form_ids;
reset role;
insert into form_results select throws_ok(format('update public.document_revisions set source_data=''{}'' where id=%L::uuid',first_id),'P0001','published_document_payload_immutable','guard blocks superseded payload changes even through privileged SQL') from form_ids;
insert into form_results select throws_ok(format('delete from public.document_revisions where id=%L::uuid',second_id),'P0001','published_document_delete_forbidden','guard blocks published deletion') from form_ids;
update public.project_states set stage='project_authorization_setup' where id='00000000-0000-4000-8000-00000000f020';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-00000000f001","role":"authenticated"}',true);
insert into form_results select throws_ok(format('select public.create_project_state_document_revision(%L::uuid)',second_id),'P0001','preauthorization_document_frozen_after_authorization','existing post-authorization freeze remains enforced') from form_ids;
reset role;
insert into form_results select * from finish();
select jsonb_agg(result) as test_results from form_results;
rollback;
