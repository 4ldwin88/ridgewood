-- Gate 2A human-QA reconciliation.
-- Project Authorization is a governed command boundary. Authenticated clients may
-- execute the function, but may not bypass it by writing authorization records directly.

revoke insert, update, delete on table public.authorization_records from authenticated;
revoke all on function public.authorize_project_state(uuid, text, jsonb) from public, anon;
grant execute on function public.authorize_project_state(uuid, text, jsonb) to authenticated, service_role;
