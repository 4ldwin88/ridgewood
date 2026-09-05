begin;

select plan(2);

-- Transaction-isolated Project Authorization layer fixtures.
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values ('00000000-0000-4000-8000-0000000000d4'::uuid,'00000000-0000-0000-0000-000000000000'::uuid,'authenticated','authenticated','gate2a-authz@example.invalid','',now(),now(),now());

create temporary table gate2a_authz_fixture as
select id workspace_id from public.workspaces limit 1;

insert into public.workspace_memberships(workspace_id,user_id,technical_role,status)
select workspace_id,'00000000-0000-4000-8000-0000000000d4'::uuid,'member','active' from gate2a_authz_fixture;

insert into public.project_states(id,workspace_id,name,stage,commercial_stage,status,priority,created_by,owner_user_id,created_at,updated_at)
select '00000000-0000-4000-8000-000000000301'::uuid,workspace_id,'Gate2A authorization no authority','authorization','authorization','active','medium','00000000-0000-4000-8000-0000000000d4'::uuid,'00000000-0000-4000-8000-0000000000d4'::uuid,now(),now() from gate2a_authz_fixture
union all
select '00000000-0000-4000-8000-000000000302'::uuid,workspace_id,'Gate2A authorization bad verification','authorization','authorization','active','medium','00000000-0000-4000-8000-0000000000d4'::uuid,'00000000-0000-4000-8000-0000000000d4'::uuid,now(),now() from gate2a_authz_fixture;

insert into public.user_permission_overrides(workspace_id,user_id,permission_key,effect,assigned_by)
select workspace_id,'00000000-0000-4000-8000-0000000000d4'::uuid,'project.authorize','grant','00000000-0000-4000-8000-0000000000d4'::uuid from gate2a_authz_fixture;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000000d4","role":"authenticated","aal":"aal1"}',true);
select throws_ok(
  $$select public.authorize_project_state('00000000-0000-4000-8000-000000000301'::uuid,'fixture','{"verified":true,"userVerified":true,"verificationReference":"no-authority","verifiedAt":"2099-01-01T00:00:00Z"}'::jsonb)$$,
  'P0001','missing_project_authority',
  'authorization fails without scoped authority'
);
reset role;

insert into public.position_assignments(workspace_id,user_id,role_family,position_key,position_title,scope,status,effective_from,assigned_by)
select workspace_id,'00000000-0000-4000-8000-0000000000d4'::uuid,'executive','gate2a_test_exec','Gate2A Test Executive',jsonb_build_object('type','workspace'),'active',now()-interval '1 minute','00000000-0000-4000-8000-0000000000d4'::uuid from gate2a_authz_fixture;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000000d4","role":"authenticated","aal":"aal1"}',true);
select throws_ok(
  $$select public.authorize_project_state('00000000-0000-4000-8000-000000000302'::uuid,'fixture','{"verified":false,"userVerified":true,"verificationReference":"bad-verification","verifiedAt":"2099-01-01T00:00:00Z"}'::jsonb)$$,
  'P0001','fresh_verification_required',
  'authorization fails without successful fresh verification'
);
reset role;

select * from finish();
rollback;
