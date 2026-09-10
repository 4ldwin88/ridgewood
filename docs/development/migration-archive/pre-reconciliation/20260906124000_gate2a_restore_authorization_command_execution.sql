-- Gate 2A human-QA correction: the public SECURITY INVOKER authorization wrapper
-- delegates to this private SECURITY DEFINER command. Authenticated callers need
-- EXECUTE on the delegated helper while anonymous callers remain denied.
grant usage on schema private to authenticated, service_role;
grant execute on function private.authorize_project_state_command(uuid,text,jsonb) to authenticated, service_role;
revoke all on function private.authorize_project_state_command(uuid,text,jsonb) from anon;
