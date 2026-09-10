-- Explicit client grants for the five tables created after the original sweep.
-- Stage requirement writes still use an invoker RPC and its existing RLS.
revoke all on table public.authorization_amendments,
  public.project_state_disposition_events,
  public.project_state_qualification_findings,
  public.project_state_qualification_decisions,
  public.project_state_stage_requirements from public, anon, authenticated;
grant select on table public.authorization_amendments,
  public.project_state_disposition_events,
  public.project_state_qualification_findings,
  public.project_state_qualification_decisions,
  public.project_state_stage_requirements to authenticated;
grant insert, update on public.project_state_stage_requirements to authenticated;

-- postgres owns all current application objects. Future migrations must grant
-- access intentionally. Do not change defaults owned by Supabase platform roles.
alter default privileges for role postgres in schema public
  revoke all on tables from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;
-- PUBLIC EXECUTE is a global PostgreSQL default: schema-only revocation cannot
-- remove it. This also protects future postgres-owned private helpers.
alter default privileges for role postgres
  revoke execute on functions from public, anon, authenticated;
