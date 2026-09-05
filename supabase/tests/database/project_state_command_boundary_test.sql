begin;

select plan(33);

-- Direct table reachability: reads remain available to authenticated users,
-- but all Project State mutations must pass through commands.
select ok(not has_table_privilege('authenticated', 'public.project_states', 'INSERT'), 'authenticated cannot directly INSERT project_states');
select ok(not has_table_privilege('authenticated', 'public.project_states', 'UPDATE'), 'authenticated cannot directly UPDATE project_states');
select ok(not has_table_privilege('authenticated', 'public.project_states', 'DELETE'), 'authenticated cannot directly DELETE project_states');
select ok(has_table_privilege('authenticated', 'public.project_states', 'SELECT'), 'authenticated can SELECT project_states');
select ok(not has_table_privilege('anon', 'public.project_states', 'SELECT'), 'anon cannot SELECT project_states');
select ok(not has_table_privilege('anon', 'public.project_states', 'INSERT'), 'anon cannot INSERT project_states');
select ok(not has_table_privilege('anon', 'public.project_states', 'UPDATE'), 'anon cannot UPDATE project_states');

-- Every exposed Project State mutation command must remain SECURITY INVOKER,
-- with its privileged implementation confined to private as SECURITY DEFINER
-- and with an empty search_path.
with commands(public_name, private_name) as (
  values
    ('create_project_state', 'create_project_state_command'),
    ('update_project_state_opportunity_basics', 'update_project_state_opportunity_basics_command'),
    ('advance_project_state_to_qualification', 'advance_project_state_to_qualification_command'),
    ('set_project_state_qualification_decision', 'set_project_state_qualification_decision_command'),
    ('resume_held_project_state', 'resume_held_project_state_command'),
    ('archive_project_state', 'archive_project_state_command'),
    ('enter_project_state_authorization', 'enter_project_state_authorization_command'),
    ('authorize_project_state', 'authorize_project_state_command'),
    ('enter_project_state_preconstruction_mobilization', 'enter_project_state_preconstruction_mobilization_command')
)
select ok(
  not p.prosecdef,
  format('public %s is SECURITY INVOKER', c.public_name)
)
from commands c
join pg_proc p on p.proname = c.public_name
join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public';

with commands(public_name, private_name) as (
  values
    ('create_project_state', 'create_project_state_command'),
    ('update_project_state_opportunity_basics', 'update_project_state_opportunity_basics_command'),
    ('advance_project_state_to_qualification', 'advance_project_state_to_qualification_command'),
    ('set_project_state_qualification_decision', 'set_project_state_qualification_decision_command'),
    ('resume_held_project_state', 'resume_held_project_state_command'),
    ('archive_project_state', 'archive_project_state_command'),
    ('enter_project_state_authorization', 'enter_project_state_authorization_command'),
    ('authorize_project_state', 'authorize_project_state_command'),
    ('enter_project_state_preconstruction_mobilization', 'enter_project_state_preconstruction_mobilization_command')
)
select ok(
  p.prosecdef and coalesce(array_to_string(p.proconfig, ', '), '') = 'search_path=""',
  format('private %s is SECURITY DEFINER with empty search_path', c.private_name)
)
from commands c
join pg_proc p on p.proname = c.private_name
join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'private';

-- Helpers and document gateways use the same exposed-invoker/private-definer boundary.
select ok(
  not (select p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='is_workspace_member' and pg_get_function_identity_arguments(p.oid)='target_workspace_id uuid'),
  'public workspace membership helper is SECURITY INVOKER'
);
select ok(
  (select p.prosecdef and coalesce(array_to_string(p.proconfig, ', '), '') = 'search_path=""' from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='is_workspace_member' and pg_get_function_identity_arguments(p.oid)='target_workspace_id uuid'),
  'private workspace membership helper is SECURITY DEFINER with empty search_path'
);
select ok(
  not (select p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='create_project_state_document_draft'),
  'public document draft creation gateway is SECURITY INVOKER'
);
select ok(
  not (select p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='update_project_state_document_draft'),
  'public document draft update gateway is SECURITY INVOKER'
);
select ok(
  (select p.prosecdef and coalesce(array_to_string(p.proconfig, ', '), '') = 'search_path=""' from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='create_project_state_document_draft_command'),
  'private document draft creation command is SECURITY DEFINER with empty search_path'
);
select ok(
  (select p.prosecdef and coalesce(array_to_string(p.proconfig, ', '), '') = 'search_path=""' from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='update_project_state_document_draft_command'),
  'private document draft update command is SECURITY DEFINER with empty search_path'
);
select ok(
  not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and has_function_privilege('authenticated', p.oid, 'EXECUTE')
  ),
  'authenticated has no executable SECURITY DEFINER function in public'
);
select ok(
  not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and p.prosecdef
      and has_function_privilege('anon', p.oid, 'EXECUTE')
  ),
  'anon cannot execute private SECURITY DEFINER functions'
);

select * from finish();
rollback;
