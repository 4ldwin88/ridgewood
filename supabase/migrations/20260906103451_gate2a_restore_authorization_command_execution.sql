grant usage on schema private to authenticated, service_role;
grant execute on function private.authorize_project_state_command(uuid,text,jsonb) to authenticated, service_role;
revoke all on function private.authorize_project_state_command(uuid,text,jsonb) from anon;
