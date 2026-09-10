begin;
select plan(11);

select ok(not exists (
  select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='r'
    and has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE')
), 'anonymous clients have no application table privileges');
select ok(not exists (
  select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='r'
    and has_table_privilege('authenticated',c.oid,'TRUNCATE,TRIGGER,REFERENCES')
), 'authenticated clients have no administrative table privileges');
select ok(not exists (
  select 1 from unnest(array['authorization_amendments','project_state_disposition_events',
    'project_state_qualification_findings','project_state_qualification_decisions']) t
  where has_table_privilege('authenticated','public.'||t,'INSERT,UPDATE,DELETE')
), 'history and qualification writes require their governed commands');
select ok(has_table_privilege('authenticated','public.project_state_stage_requirements','INSERT')
  and has_table_privilege('authenticated','public.project_state_stage_requirements','UPDATE'),
  'stage requirement invoker RPC retains its RLS-protected write grants');
select ok(not exists (
  select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='r' and not c.relrowsecurity
), 'all public application tables have RLS enabled');

-- Real disposable objects prove effective defaults, including PUBLIC inheritance.
create table public.client_privilege_probe(id integer);
create sequence public.client_privilege_probe_seq;
create function public.client_privilege_probe_fn() returns integer language sql as 'select 1';
create function private.client_privilege_probe_fn() returns integer language sql as 'select 1';
select ok(not has_table_privilege('anon','public.client_privilege_probe','SELECT,INSERT,UPDATE,DELETE,TRUNCATE')
  and not has_table_privilege('authenticated','public.client_privilege_probe','SELECT,INSERT,UPDATE,DELETE,TRUNCATE'),
  'new postgres-owned public tables need explicit client grants');
select ok(not has_sequence_privilege('anon','public.client_privilege_probe_seq','USAGE,SELECT,UPDATE')
  and not has_sequence_privilege('authenticated','public.client_privilege_probe_seq','USAGE,SELECT,UPDATE'),
  'new postgres-owned public sequences need explicit client grants');
select ok(not has_function_privilege('anon','public.client_privilege_probe_fn()','EXECUTE')
  and not has_function_privilege('authenticated','public.client_privilege_probe_fn()','EXECUTE'),
  'new public functions are not executable by clients through PUBLIC');
select ok(not has_function_privilege('anon','private.client_privilege_probe_fn()','EXECUTE')
  and not has_function_privilege('authenticated','private.client_privilege_probe_fn()','EXECUTE'),
  'new private helpers need explicit execution grants');
grant execute on function public.client_privilege_probe_fn() to authenticated;
select ok(has_function_privilege('authenticated','public.client_privilege_probe_fn()','EXECUTE')
  and not has_function_privilege('anon','public.client_privilege_probe_fn()','EXECUTE'),
  'explicit authenticated grant exposes only the intended role');
select ok(has_table_privilege('service_role','public.client_privilege_probe','SELECT,INSERT,UPDATE,DELETE'),
  'service role platform defaults remain intact');
select * from finish();
rollback;
