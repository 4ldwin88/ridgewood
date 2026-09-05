begin;

select plan(12);

select ok(
  not has_table_privilege('authenticated', 'public.project_states', 'INSERT'),
  'authenticated cannot directly INSERT project_states'
);
select ok(
  not has_table_privilege('authenticated', 'public.project_states', 'UPDATE'),
  'authenticated cannot directly UPDATE project_states'
);
select ok(
  has_table_privilege('authenticated', 'public.project_states', 'SELECT'),
  'authenticated can SELECT project_states'
);
select ok(
  not has_table_privilege('anon', 'public.project_states', 'SELECT'),
  'anon cannot SELECT project_states'
);

select ok(
  not (select p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='create_project_state' and pg_get_function_identity_arguments(p.oid)='project_state_input jsonb'),
  'public create_project_state is SECURITY INVOKER'
);
select ok(
  (select p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='create_project_state_command' and pg_get_function_identity_arguments(p.oid)='project_state_input jsonb'),
  'private create_project_state_command is SECURITY DEFINER'
);
select is(
  (select array_to_string(p.proconfig, ', ') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='create_project_state_command' and pg_get_function_identity_arguments(p.oid)='project_state_input jsonb'),
  'search_path=""',
  'private create command pins an empty search_path'
);

select ok(
  not (select p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='authorize_project_state' and pg_get_function_identity_arguments(p.oid)='project_state_input uuid, authority_basis_input text, verification_input jsonb'),
  'public authorize_project_state is SECURITY INVOKER'
);
select ok(
  (select p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='authorize_project_state_command' and pg_get_function_identity_arguments(p.oid)='project_state_input uuid, authority_basis_input text, verification_input jsonb'),
  'private authorize_project_state_command is SECURITY DEFINER'
);
select is(
  (select array_to_string(p.proconfig, ', ') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='authorize_project_state_command' and pg_get_function_identity_arguments(p.oid)='project_state_input uuid, authority_basis_input text, verification_input jsonb'),
  'search_path=""',
  'private authorization command pins an empty search_path'
);

select ok(
  not (select p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='is_workspace_member' and pg_get_function_identity_arguments(p.oid)='target_workspace_id uuid'),
  'public workspace membership helper is SECURITY INVOKER'
);
select ok(
  (select p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='is_workspace_member' and pg_get_function_identity_arguments(p.oid)='target_workspace_id uuid'),
  'private workspace membership helper is SECURITY DEFINER'
);

select * from finish();
rollback;
