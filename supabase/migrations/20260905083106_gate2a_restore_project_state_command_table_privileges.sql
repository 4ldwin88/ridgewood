-- The current named project-state commands are SECURITY INVOKER functions. They require
-- the authenticated role's underlying INSERT/UPDATE privileges and rely on command logic +
-- RLS for governance. Restore those minimum privileges after testing a stricter table boundary.
grant insert, update on table public.project_states to authenticated;
grant select on table public.project_states to authenticated;
