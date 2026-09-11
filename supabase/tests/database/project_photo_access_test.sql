begin;
select plan(6);
insert into auth.users(id,instance_id,aud,role,email,created_at,updated_at) values
('00000000-0000-4000-8000-00000000f001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','photo-owner@example.invalid',now(),now()),
('00000000-0000-4000-8000-00000000f002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','photo-outsider@example.invalid',now(),now());
insert into public.workspaces(id,name,created_by) values ('00000000-0000-4000-8000-00000000f010','Photo contract','00000000-0000-4000-8000-00000000f001');
insert into public.workspace_memberships(workspace_id,user_id,technical_role,status) values ('00000000-0000-4000-8000-00000000f010','00000000-0000-4000-8000-00000000f001','owner','active');
insert into public.user_permission_overrides(workspace_id,user_id,permission_key,effect,assigned_by) values ('00000000-0000-4000-8000-00000000f010','00000000-0000-4000-8000-00000000f001','document.create_draft','grant','00000000-0000-4000-8000-00000000f001');
insert into public.project_states(id,workspace_id,name,stage,commercial_stage,status,priority,created_by,owner_user_id) values ('00000000-0000-4000-8000-00000000f020','00000000-0000-4000-8000-00000000f010','Photo fixture','opportunity','opportunity','active','medium','00000000-0000-4000-8000-00000000f001','00000000-0000-4000-8000-00000000f001');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-00000000f001","role":"authenticated"}',true);
select lives_ok($$insert into storage.objects(bucket_id,name) values ('ridgewood-project-photos','00000000-0000-4000-8000-00000000f020/cover')$$,'authorized member can insert cover metadata');
select is((select count(*)::integer from storage.objects where bucket_id='ridgewood-project-photos'),1,'member reads the cover');
select lives_ok($$update storage.objects set metadata='{"mimetype":"image/png"}' where bucket_id='ridgewood-project-photos'$$,'member can replace cover metadata');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-00000000f002","role":"authenticated"}',true);
select is((select count(*)::integer from storage.objects where bucket_id='ridgewood-project-photos'),0,'outsider cannot read cover');
select throws_ok($$insert into storage.objects(bucket_id,name) values ('ridgewood-project-photos','00000000-0000-4000-8000-00000000f020/cover')$$,'42501',null,'outsider upload is denied');
reset role;
update public.user_permission_overrides set effect='revoke' where permission_key='document.create_draft' and workspace_id='00000000-0000-4000-8000-00000000f010';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-00000000f001","role":"authenticated"}',true);
update storage.objects set metadata='{}' where bucket_id='ridgewood-project-photos';
select is((select metadata->>'mimetype' from storage.objects where bucket_id='ridgewood-project-photos'),'image/png','revoked editor cannot replace cover');
reset role;
select * from finish();
rollback;
