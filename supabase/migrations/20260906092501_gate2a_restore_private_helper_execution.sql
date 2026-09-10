grant usage on schema private to authenticated, service_role;
grant execute on function private.assert_cross_stage_project_state_writable(uuid) to authenticated, service_role;
revoke all on function private.assert_cross_stage_project_state_writable(uuid) from anon;
