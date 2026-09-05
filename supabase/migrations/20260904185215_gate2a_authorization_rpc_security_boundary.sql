-- Gate 2A human-QA reconciliation.
-- Project Authorization is a governed command boundary. Authenticated clients may
-- execute the function, but may not bypass it by writing authorization records directly.
--
-- The live authorization RPC is intentionally SECURITY DEFINER so its governed,
-- server-validated transaction can write authorization_records while direct client
-- writes remain closed. A fixed search_path is required at that elevated boundary.

alter function public.authorize_project_state(uuid, text, jsonb) security definer;
alter function public.authorize_project_state(uuid, text, jsonb) set search_path = public;

revoke insert, update, delete on table public.authorization_records from authenticated;
revoke all on function public.authorize_project_state(uuid, text, jsonb) from public, anon;
grant execute on function public.authorize_project_state(uuid, text, jsonb) to authenticated, service_role;
