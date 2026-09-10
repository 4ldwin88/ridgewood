-- Gate 2A: project_states is a governed lifecycle root. Authenticated clients may read it,
-- but mutations must flow through the named command functions/RPC boundary.
-- Existing command functions are SECURITY INVOKER and therefore retain only the minimum
-- table privileges they actually require through explicit function execution context.

revoke all on table public.project_states from anon;
revoke insert, update, delete, truncate, references, trigger on table public.project_states from authenticated;
grant select on table public.project_states to authenticated;
