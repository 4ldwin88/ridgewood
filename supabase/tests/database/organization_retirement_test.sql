begin;
select plan(5);
insert into auth.users(id,instance_id,aud,role,email,created_at,updated_at) values
('00000000-0000-4000-8000-00000000e001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','org-owner@example.invalid',now(),now()),
('00000000-0000-4000-8000-00000000e002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','org-outsider@example.invalid',now(),now());
insert into public.workspaces(id,name,created_by) values ('00000000-0000-4000-8000-00000000e010','Organization contract','00000000-0000-4000-8000-00000000e001');
insert into public.workspace_memberships(workspace_id,user_id,technical_role,status) values ('00000000-0000-4000-8000-00000000e010','00000000-0000-4000-8000-00000000e001','owner','active');
insert into public.organizations(id,workspace_id,name,created_by) values ('00000000-0000-4000-8000-00000000e030','00000000-0000-4000-8000-00000000e010','Retained client','00000000-0000-4000-8000-00000000e001');
insert into public.project_states(id,workspace_id,name,organization_id,stage,commercial_stage,status,priority,created_by,owner_user_id) values ('00000000-0000-4000-8000-00000000e020','00000000-0000-4000-8000-00000000e010','Linked fixture','00000000-0000-4000-8000-00000000e030','opportunity','opportunity','active','medium','00000000-0000-4000-8000-00000000e001','00000000-0000-4000-8000-00000000e001');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-00000000e001","role":"authenticated"}',true);
update public.organizations set is_retired=true where id='00000000-0000-4000-8000-00000000e030';
select is((select is_retired from public.organizations where id='00000000-0000-4000-8000-00000000e030'),true,'member can remove organization from choices');
select is((select organization_id::text from public.project_states where id='00000000-0000-4000-8000-00000000e020'),'00000000-0000-4000-8000-00000000e030','existing project association retained');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-00000000e002","role":"authenticated"}',true);
select is((select count(*)::integer from public.organizations),0,'outsider cannot read organizations');
update public.organizations set is_retired=false where id='00000000-0000-4000-8000-00000000e030';
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-00000000e001","role":"authenticated"}',true);
select is((select is_retired from public.organizations where id='00000000-0000-4000-8000-00000000e030'),true,'outsider cannot restore organization');
update public.organizations set is_retired=false where id='00000000-0000-4000-8000-00000000e030';
select is((select is_retired from public.organizations where id='00000000-0000-4000-8000-00000000e030'),false,'member can restore organization');
reset role;
select * from finish();
rollback;
