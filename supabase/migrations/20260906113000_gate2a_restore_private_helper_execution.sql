-- Human QA v0.17 exposed that cross-stage write RPCs call this private
-- SECURITY DEFINER assertion helper through authenticated-facing commands.
-- The helper remains private and inaccessible to anon, while authenticated
-- and service_role receive only the execution needed by those governed paths.
grant usage on schema private to authenticated, service_role;
grant execute on function private.assert_cross_stage_project_state_writable(uuid) to authenticated, service_role;
revoke all on function private.assert_cross_stage_project_state_writable(uuid) from anon;
