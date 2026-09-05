begin;

select plan(2);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('00000000-0000-4000-8000-0000000000c6','00000000-0000-0000-0000-000000000000','authenticated','authenticated','gate2a-success@example.invalid','',now(),now(),now());

create temporary table gate2a_success_fixture as
select id as workspace_id from public.workspaces limit 1;

insert into public.workspace_memberships(workspace_id,user_id,technical_role,status)
select workspace_id,'00000000-0000-4000-8000-0000000000c6'::uuid,'member','active' from gate2a_success_fixture;

insert into public.user_permission_overrides(workspace_id,user_id,permission_key,effect,assigned_by)
select workspace_id,'00000000-0000-4000-8000-0000000000c6'::uuid,'project.authorize','grant','00000000-0000-4000-8000-0000000000c6'::uuid from gate2a_success_fixture;

insert into public.position_assignments(id,workspace_id,user_id,role_family,position_key,position_title,scope,status,effective_from,assigned_by)
select '00000000-0000-4000-8000-000000000406'::uuid,workspace_id,'00000000-0000-4000-8000-0000000000c6'::uuid,'executive','gate2a_test_executive','Gate2A Test Executive',jsonb_build_object('type','workspace'),'active',now()-interval '1 minute','00000000-0000-4000-8000-0000000000c6'::uuid from gate2a_success_fixture;

insert into public.project_states(id,workspace_id,name,stage,commercial_stage,status,priority,created_by,owner_user_id,created_at,updated_at)
select '00000000-0000-4000-8000-000000000306'::uuid,workspace_id,'Gate2A successful authorization','authorization','authorization','active','medium','00000000-0000-4000-8000-0000000000c6'::uuid,'00000000-0000-4000-8000-0000000000c6'::uuid,now(),now() from gate2a_success_fixture;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000000c6","role":"authenticated","aal":"aal1"}',true);
select public.ensure_project_state_predevelopment_domains('00000000-0000-4000-8000-000000000306'::uuid);

reset role;
update public.predevelopment_domains
set readiness='satisfied'::public.readiness_state,
    updated_by='00000000-0000-4000-8000-0000000000c6'::uuid,
    updated_at=now()
where project_state_id='00000000-0000-4000-8000-000000000306'::uuid;
update public.project_state_stage_requirements
set status='satisfied'::public.readiness_state,
    updated_by='00000000-0000-4000-8000-0000000000c6'::uuid,
    updated_at=now()
where project_state_id='00000000-0000-4000-8000-000000000306'::uuid
  and stage='authorization' and required;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000000c6","role":"authenticated","aal":"aal1"}',true);
select lives_ok(
  $$select public.authorize_project_state('00000000-0000-4000-8000-000000000306'::uuid,'Gate2A regression fixture',jsonb_build_object('verified',true,'userVerified',true,'verificationReference','gate2a-success-replay-ref','verifiedAt',now()::text))$$,
  'fully ready Project State authorizes successfully'
);

-- Restore only the stage so replay protection is tested independently of the stage guard.
reset role;
update public.project_states
set stage='authorization',commercial_stage='authorization',updated_at=now()
where id='00000000-0000-4000-8000-000000000306'::uuid;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000000c6","role":"authenticated","aal":"aal1"}',true);
select throws_ok(
  $$select public.authorize_project_state('00000000-0000-4000-8000-000000000306'::uuid,'Gate2A replay fixture',jsonb_build_object('verified',true,'userVerified',true,'verificationReference','gate2a-success-replay-ref','verifiedAt',now()::text))$$,
  'P0001','verification_replay_detected',
  'successful verification reference cannot be replayed'
);

reset role;
select * from finish();
rollback;
