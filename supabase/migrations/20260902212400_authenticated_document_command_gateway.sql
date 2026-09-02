create or replace function public.execute_document_command(command_name text, command_input jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  actor_id uuid := auth.uid();
  result_id uuid;
  target_workspace uuid;
begin
  if actor_id is null then raise exception 'authentication_required'; end if;

  if command_name = 'createDraft' then
    target_workspace := (command_input->>'workspaceId')::uuid;
    if not public.has_app_permission(target_workspace, 'document.create_draft') then raise exception 'missing_permission'; end if;
    result_id := private.create_document_draft_atomic(target_workspace, nullif(command_input->>'projectId','')::uuid, nullif(command_input->>'opportunityId','')::uuid, command_input->>'packageKey', command_input->>'categoryKey', command_input->>'documentType', command_input->>'title', coalesce(command_input->'initialData','{}'::jsonb));
  elsif command_name = 'updateDraft' then
    select dr.workspace_id into target_workspace from public.document_records dr join public.document_revisions rv on rv.document_id=dr.id where rv.id=(command_input->>'revisionId')::uuid;
    if target_workspace is null or not public.is_workspace_member(target_workspace) then raise exception 'workspace_access_denied'; end if;
    result_id := private.update_document_draft_atomic((command_input->>'revisionId')::uuid, coalesce(command_input->'data','{}'::jsonb));
  elsif command_name = 'createRevisionFromPublished' then
    select dr.workspace_id into target_workspace from public.document_records dr join public.document_revisions rv on rv.document_id=dr.id where rv.id=(command_input->>'publishedRevisionId')::uuid;
    if target_workspace is null or not public.has_app_permission(target_workspace, 'document.create_revision') then raise exception 'missing_permission'; end if;
    result_id := private.create_revision_from_published_atomic((command_input->>'publishedRevisionId')::uuid, nullif(command_input->>'reason',''));
  else
    raise exception 'unsupported_document_command';
  end if;
  return result_id;
end;
$$;
revoke all on function public.execute_document_command(text,jsonb) from public, anon;
grant execute on function public.execute_document_command(text,jsonb) to authenticated;
