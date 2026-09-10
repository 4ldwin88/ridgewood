-- Gate 2A hardening: privileged project/document commands remain intentionally
-- callable by authenticated sessions, but their SECURITY DEFINER name resolution
-- is pinned to trusted schemas and anonymous execution is explicitly denied.

alter function public.authorize_project_state(uuid, text, jsonb)
  set search_path = pg_catalog, public;

alter function public.create_project_state_document_draft(uuid, text, text, text, text, jsonb)
  set search_path = pg_catalog, public;

alter function public.update_project_state_document_draft(uuid, jsonb)
  set search_path = pg_catalog, public;

revoke execute on function public.authorize_project_state(uuid, text, jsonb) from public, anon;
revoke execute on function public.create_project_state_document_draft(uuid, text, text, text, text, jsonb) from public, anon;
revoke execute on function public.update_project_state_document_draft(uuid, jsonb) from public, anon;

grant execute on function public.authorize_project_state(uuid, text, jsonb) to authenticated, service_role;
grant execute on function public.create_project_state_document_draft(uuid, text, text, text, text, jsonb) to authenticated, service_role;
grant execute on function public.update_project_state_document_draft(uuid, jsonb) to authenticated, service_role;
