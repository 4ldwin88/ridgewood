-- Gate 2A hardening: Project State is authenticated workspace data.
-- Remove legacy/default anonymous table privileges without changing the current
-- SECURITY INVOKER command architecture used by authenticated sessions.
revoke all on table public.project_states from anon;
