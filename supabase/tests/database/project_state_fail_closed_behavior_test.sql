begin;

select plan(8);

-- Transaction-isolated behavioral fixtures. These users and Project States are rolled back.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-4000-8000-0000000000a1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','gate2a-member@example.invalid','',now(),now(),now()),
  ('00000000-0000-4000-8000-0000000000b2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','gate2a-outsider@example.invalid','',now(),now(),now());

create temporary table gate2a_fixture as
select w.id as workspace_id from public.workspaces w limit 1;

insert into public.workspace_memberships(workspace_id,user_id,technical_role,status)
select workspace_id,'00000000-0000-4000-8000-0000000000a1'::uuid,'member','active'
from gate2a_fixture;

insert into public.project_states(id,workspace_id,name,stage,commercial_stage,status,priority,created_by,owner_user_id,created_at,updated_at)
select '00000000-0000-4000-8000-000000000101'::uuid,workspace_id,'Gate2A wrong-stage fixture','qualification','qualification','active','medium','00000000-0000-4000-8000-0000000000a1'::uuid,'00000000-0000-4000-8000-0000000000a1'::uuid,now(),now() from gate2a_fixture
union all
select '00000000-0000-4000-8000-000000000102'::uuid,workspace_id,'Gate2A held fixture','opportunity','opportunity','held','medium','00000000-0000-4000-8000-0000000000a1'::uuid,'00000000-0000-4000-8000-0000000000a1'::uuid,now(),now() from gate2a_fixture
union all
select '00000000-0000-4000-8000-000000000103'::uuid,workspace_id,'Gate2A archived fixture','opportunity','opportunity','active','medium','00000000-0000-4000-8000-0000000000a1'::uuid,'00000000-0000-4000-8000-0000000000a1'::uuid,now(),now() from gate2a_fixture;

update public.project_states
set archived_at=now(), archived_by='00000000-0000-4000-8000-0000000000a1'::uuid
where id='00000000-0000-4000-8000-000000000103'::uuid;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated","aal":"aal1"}',true);

select throws_ok(
  $$select public.update_project_state_opportunity_basics('00000000-0000-4000-8000-000000000101'::uuid,'{"name":"Should fail"}'::jsonb)$$,
  'P0001','opportunity_edit_not_allowed_from_stage:qualification',
  'member cannot edit opportunity basics from wrong stage'
);
select throws_ok(
  $$select public.advance_project_state_to_qualification('00000000-0000-4000-8000-000000000102'::uuid)$$,
  'P0001','stage_advance_not_allowed_for_status:held',
  'held Project State cannot advance'
);
select throws_ok(
  $$select public.archive_project_state('00000000-0000-4000-8000-000000000103'::uuid)$$,
  'P0001','project_state_already_archived',
  'archived Project State cannot be archived again'
);
select throws_ok(
  $$select public.resume_held_project_state('00000000-0000-4000-8000-000000000101'::uuid)$$,
  'P0001','Only a held Project State can be resumed',
  'active Project State cannot be resumed'
);

select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated","aal":"aal1"}',true);

select throws_ok(
  $$select public.update_project_state_opportunity_basics('00000000-0000-4000-8000-000000000102'::uuid,'{"name":"Outsider"}'::jsonb)$$,
  'P0001','workspace_access_denied',
  'non-member cannot edit Project State'
);
select throws_ok(
  $$select public.advance_project_state_to_qualification('00000000-0000-4000-8000-000000000101'::uuid)$$,
  'P0001','workspace_access_denied',
  'non-member cannot advance Project State'
);
select throws_ok(
  $$select public.archive_project_state('00000000-0000-4000-8000-000000000101'::uuid)$$,
  'P0001','workspace_access_denied',
  'non-member cannot archive Project State'
);
select throws_ok(
  $$select public.enter_project_state_authorization('00000000-0000-4000-8000-000000000101'::uuid)$$,
  'P0001','workspace_access_denied',
  'non-member cannot enter authorization'
);

reset role;
select * from finish();
rollback;
