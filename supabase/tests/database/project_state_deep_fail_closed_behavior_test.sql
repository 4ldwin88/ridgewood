begin;

select plan(4);

-- Transaction-isolated fixtures for deeper Gate 2A lifecycle gates.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('00000000-0000-4000-8000-0000000000c3','00000000-0000-0000-0000-000000000000','authenticated','authenticated','gate2a-deep@example.invalid','',now(),now(),now());

create temporary table gate2a_deep_fixture as
select w.id as workspace_id from public.workspaces w limit 1;

insert into public.workspace_memberships(workspace_id,user_id,technical_role,status)
select workspace_id,'00000000-0000-4000-8000-0000000000c3'::uuid,'member','active'
from gate2a_deep_fixture;

insert into public.project_states(id,workspace_id,name,stage,commercial_stage,status,priority,created_by,owner_user_id,created_at,updated_at)
select '00000000-0000-4000-8000-000000000201'::uuid,workspace_id,'Gate2A incomplete qualification','qualification','qualification','active','medium','00000000-0000-4000-8000-0000000000c3'::uuid,'00000000-0000-4000-8000-0000000000c3'::uuid,now(),now() from gate2a_deep_fixture
union all
select '00000000-0000-4000-8000-000000000202'::uuid,workspace_id,'Gate2A incomplete predevelopment','predevelopment','predevelopment','active','medium','00000000-0000-4000-8000-0000000000c3'::uuid,'00000000-0000-4000-8000-0000000000c3'::uuid,now(),now() from gate2a_deep_fixture
union all
select '00000000-0000-4000-8000-000000000203'::uuid,workspace_id,'Gate2A authorization no permission','authorization','authorization','active','medium','00000000-0000-4000-8000-0000000000c3'::uuid,'00000000-0000-4000-8000-0000000000c3'::uuid,now(),now() from gate2a_deep_fixture
union all
select '00000000-0000-4000-8000-000000000204'::uuid,workspace_id,'Gate2A incomplete setup','project_authorization_setup','project_authorization_setup','active','medium','00000000-0000-4000-8000-0000000000c3'::uuid,'00000000-0000-4000-8000-0000000000c3'::uuid,now(),now() from gate2a_deep_fixture;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000000c3","role":"authenticated","aal":"aal1"}',true);

select throws_ok(
  $$select public.set_project_state_qualification_decision('00000000-0000-4000-8000-000000000201'::uuid,'advance',null)$$,
  'P0001','qualification_domains_incomplete:5',
  'qualification cannot advance without five domain findings'
);
select throws_ok(
  $$select public.enter_project_state_authorization('00000000-0000-4000-8000-000000000202'::uuid)$$,
  'P0001','predevelopment_requirements_incomplete:7',
  'predevelopment cannot enter authorization with incomplete domains'
);
select throws_ok(
  $$select public.authorize_project_state('00000000-0000-4000-8000-000000000203'::uuid,'fixture','{"verified":true,"userVerified":true,"verificationReference":"gate2a-no-permission","verifiedAt":"2099-01-01T00:00:00Z"}'::jsonb)$$,
  'P0001','missing_project_authorize_permission',
  'authorization fails closed without project.authorize permission'
);
select throws_ok(
  $$select public.enter_project_state_preconstruction_mobilization('00000000-0000-4000-8000-000000000204'::uuid)$$,
  'P0001','project_setup_requirements_incomplete',
  'project setup cannot enter preconstruction with incomplete requirements'
);

reset role;
select * from finish();
rollback;
